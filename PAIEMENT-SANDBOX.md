# Paiement KIC : sandbox puis production

État local vérifié le 30 octobre 2026 : paiement activé, mode sandbox, schéma migré. Les clés Stripe locales sont absentes. Le bouton de test reste accessible ; le serveur refuse de réserver une commande tant que la configuration Stripe est incomplète. Aucun encaissement réel n'a été testé.

## Configurer les tests

Dans `api/.env` uniquement, conserver `PAYMENTS_ENABLED=true` et `PAYMENT_MODE=sandbox`. Renseigner `STRIPE_SECRET_KEY` avec la clé secrète de l'environnement de test Stripe et `STRIPE_WEBHOOK_SECRET` avec le secret de signature du webhook correspondant. Ne jamais placer ces secrets dans le JavaScript ou Git. Une clé live est refusée en sandbox.

Le webhook est `https://votre-domaine/api/payments/webhook/stripe`. Pour WAMP, utiliser le transfert local de Stripe CLI vers `http://localhost/kic-main/api/payments/webhook/stripe` et son secret de signature. Événements traités : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`.

Exécuter `php api/scripts/check-payment-readiness.php --strict`, puis vérifier un paiement de test complet, une carte refusée, une reprise de commande, une annulation et un remboursement depuis le tableau de bord Stripe de test. Les tests automatisés simulent Stripe : ils ne remplacent pas ce contrôle de bout en bout. La confirmation doit provenir du serveur et du webhook, pas du seul retour du navigateur.

Planifier `php api/scripts/expire-orders.php` toutes les cinq minutes. Les sessions sont rapprochées avec Stripe avant libération du stock. Surveiller les erreurs et les transactions signalées dans « Demandes et préparation du paiement » du dashboard.

## Déploiement

Sauvegarder fichiers et base avant modification. Conserver le `.env` de l'hébergement, y sélectionner explicitement sandbox et renseigner les clés de test. Ne pas remplacer une base existante par le seed.

Exécuter `php api/scripts/migrate.php --check`, puis `php api/scripts/migrate.php --apply --allow-production` sur l'hébergement après sauvegarde. Vérifier ensuite la préparation du paiement et les parcours publics et administrateur.

Le paquet préparé par `php api/scripts/prepare-release.php` contient la boutique, l'API et le dashboard compilé pour `/admin/`. Il exclut les secrets, sauvegardes, vidéos et tests. Le dossier `admin/` local est compilé pour `/kic-main/admin/` ; utiliser le paquet pour un hébergement à la racine. Retirer les anciennes archives publiques de l'hébergement ; leur accès est également interdit par Apache.

## Passage en production ultérieur

Confirmer d'abord les informations légales réelles, les CGV, les conditions de rétractation applicables, la fiscalité et les tarifs de livraison. Compléter les pages publiques avant d'ouvrir les ventes. Renseigner `SELLER_REGISTRATION`, `PRICE_TAX_MODE=TTC` ou `VAT_EXEMPT` selon la situation réelle, et `SALES_TERMS_CONFIRMED=true` après vérification. Le PDF actuel est un récapitulatif de commande, pas une facture fiscale.

Configurer les clés et le webhook de production, `APP_ENV=production`, une `APP_URL` HTTPS et `PAYMENT_MODE=live`. Relancer les contrôles et valider les webhooks. Ne pas réutiliser les commandes sandbox : elles restent identifiées comme tests et exclues du chiffre d'affaires réel. Une demande de remboursement dans KIC n'effectue pas automatiquement un remboursement Stripe : le traiter dans Stripe puis vérifier sa confirmation par webhook.

## Vérifications réalisées

8 contrôles de sécurité et 29 contrôles métier passent sur une base de test isolée. Sont couverts notamment les montants, les zones, les doublons, les réservations, les annulations, les événements répétés et les remboursements partiels. Le panier local affiche bien 40 € de produit + 12 € de livraison = 52 €. Le contrôle local de préparation signale correctement les secrets Stripe manquants.

Ces changements sont locaux. Leur publication et la réception effective des webhooks de l'hébergement restent à vérifier.
