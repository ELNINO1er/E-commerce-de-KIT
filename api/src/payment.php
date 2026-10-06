<?php
declare(strict_types=1);

function stripe_request(string $path, array $fields): array
{
    global $config;
    $key = (string)($config['stripe_secret_key'] ?? '');
    if (!str_starts_with($key, 'sk_test_') && !str_starts_with($key, 'sk_live_')) {
        fail(503, 'PAYMENT_CONFIGURATION_ERROR', 'Stripe n’est pas encore configuré.');
    }
    if (!function_exists('curl_init')) fail(503, 'PAYMENT_UNAVAILABLE', 'Le module de paiement est indisponible.');
    $curl = curl_init('https://api.stripe.com/v1/' . ltrim($path, '/'));
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
        CURLOPT_USERPWD => $key . ':',
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_POSTFIELDS => http_build_query($fields),
    ]);
    $raw = curl_exec($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);
    if ($raw === false || $curlError !== '') {
        error_log('Stripe réseau : ' . $curlError);
        fail(502, 'PAYMENT_UNAVAILABLE', 'Stripe est temporairement indisponible.');
    }
    $result = json_decode((string)$raw, true);
    if ($status < 200 || $status >= 300 || !is_array($result)) {
        error_log('Stripe API HTTP ' . $status . ': ' . substr((string)$raw, 0, 500));
        fail(502, 'PAYMENT_PROVIDER_ERROR', 'Stripe n’a pas pu préparer le paiement.');
    }
    return $result;
}

function create_stripe_checkout(): never
{
    global $config;
    security_rate_limit('stripe-checkout', 12, 300);
    $body = json_body();
    require_fields($body, ['orderNumber']);
    $order = find_order((string)$body['orderNumber']);
    if ($order['status'] !== 'PENDING') fail(409, 'ORDER_NOT_PAYABLE', 'Cette commande ne peut plus être payée.');
    if ((int)$order['total'] < 50) fail(422, 'PAYMENT_AMOUNT_INVALID', 'Le montant de la commande est invalide.');

    $baseUrl = rtrim((string)$config['app_url'], '/');
    $session = stripe_request('checkout/sessions', [
        'mode' => 'payment',
        'success_url' => $baseUrl . '/confirmation.html?payment=success&session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => $baseUrl . '/commande.html?payment=cancelled',
        'customer_email' => $order['contact_email'],
        'client_reference_id' => $order['order_number'],
        'metadata[order_number]' => $order['order_number'],
        'payment_intent_data[metadata][order_number]' => $order['order_number'],
        'line_items[0][price_data][currency]' => strtolower($order['currency']),
        'line_items[0][price_data][product_data][name]' => 'Commande KIC ' . $order['order_number'],
        'line_items[0][price_data][product_data][description]' => 'Produits cacao et livraison selon le récapitulatif KIC',
        'line_items[0][price_data][unit_amount]' => (int)$order['total'],
        'line_items[0][quantity]' => 1,
        'locale' => 'fr',
        'expires_at' => time() + 1800,
    ]);
    if (empty($session['id']) || empty($session['url'])) fail(502, 'PAYMENT_PROVIDER_ERROR', 'Réponse Stripe incomplète.');
    db()->prepare("INSERT INTO payments(order_id,provider,method,status,reference,amount,currency,checkout_url) VALUES(?,'STRIPE','CARD','PENDING',?,?,?,?)")
        ->execute([(int)$order['id'], $session['id'], (int)$order['total'], $order['currency'], $session['url']]);
    respond(['provider' => 'STRIPE', 'reference' => $session['id'], 'checkoutUrl' => $session['url']], 201);
}

function stripe_signature_is_valid(string $payload, string $header, string $secret): bool
{
    $timestamp = null; $signatures = [];
    foreach (explode(',', $header) as $part) {
        [$key, $value] = array_pad(explode('=', trim($part), 2), 2, '');
        if ($key === 't') $timestamp = ctype_digit($value) ? (int)$value : null;
        if ($key === 'v1' && preg_match('/^[a-f0-9]{64}$/', $value)) $signatures[] = $value;
    }
    if ($timestamp === null || abs(time() - $timestamp) > 300 || !$signatures) return false;
    $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
    foreach ($signatures as $signature) if (hash_equals($expected, $signature)) return true;
    return false;
}

function stripe_webhook(): never
{
    global $config;
    $payload = (string)file_get_contents('php://input');
    $secret = (string)($config['stripe_webhook_secret'] ?? '');
    $signature = (string)($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '');
    if ($secret === '' || !stripe_signature_is_valid($payload, $signature, $secret)) {
        fail(400, 'INVALID_STRIPE_SIGNATURE', 'Signature Stripe invalide.');
    }
    $event = json_decode($payload, true);
    if (!is_array($event) || empty($event['id']) || empty($event['type'])) fail(400, 'INVALID_STRIPE_EVENT', 'Événement Stripe invalide.');
    $object = $event['data']['object'] ?? [];
    $sessionId = (string)($object['id'] ?? '');
    if ($sessionId === '') respond(['received' => true]);

    $pdo = db(); $pdo->beginTransaction();
    try {
        $query = $pdo->prepare('SELECT p.*,o.status order_status FROM payments p JOIN orders o ON o.id=p.order_id WHERE p.reference=? FOR UPDATE');
        $query->execute([$sessionId]); $payment = $query->fetch();
        if (!$payment) { $pdo->commit(); respond(['received' => true]); }
        if ($event['type'] === 'checkout.session.completed' && ($object['payment_status'] ?? '') === 'paid') {
            $paidAmount = (int)($object['amount_total'] ?? -1);
            $currency = strtoupper((string)($object['currency'] ?? ''));
            if ($paidAmount !== (int)$payment['amount'] || $currency !== $payment['currency']) {
                throw new RuntimeException('Montant Stripe incohérent pour ' . $sessionId);
            }
            $pdo->prepare("UPDATE payments SET status='SUCCESS',payment_intent=?,paid_at=NOW() WHERE id=?")
                ->execute([(string)($object['payment_intent'] ?? ''), $payment['id']]);
            if ($payment['order_status'] === 'PENDING') $pdo->prepare("UPDATE orders SET status='PAID' WHERE id=?")->execute([$payment['order_id']]);
        } elseif ($event['type'] === 'checkout.session.expired') {
            $pdo->prepare("UPDATE payments SET status='CANCELLED' WHERE id=? AND status='PENDING'")->execute([$payment['id']]);
        } elseif ($event['type'] === 'checkout.session.async_payment_failed') {
            $pdo->prepare("UPDATE payments SET status='FAILED' WHERE id=? AND status='PENDING'")->execute([$payment['id']]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
    respond(['received' => true]);
}
