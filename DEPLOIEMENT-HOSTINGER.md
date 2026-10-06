# Déploiement KIC sur Hostinger

## Contenu publié

- Boutique : racine `public_html`
- Dashboard : `https://kic-fr.com/admin/`
- API PHP : `https://kic-fr.com/api/`
- Base : MySQL Hostinger, schéma `api/schema.sql`

## Configuration privée

Créer `public_html/api/.env` depuis `api/.env.example`. Renseigner `APP_KEY`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `ORDER_NOTIFICATION_EMAIL`, `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`. Le fichier est bloqué par Apache et ignoré par Git. Commencer avec les clés Stripe de test.

## Initialisation

1. Importer `api/schema.sql` dans phpMyAdmin.
2. Exécuter une fois `php api/scripts/seed.php` ou appeler le script avec PHP depuis le terminal Hostinger.
3. Créer l’administrateur avec `php api/scripts/create-admin.php email mot-de-passe Prenom Nom`.
4. Vérifier `https://kic-fr.com/api/health`.
5. Ouvrir `https://kic-fr.com/admin/`.
6. Ajouter `https://kic-fr.com/merchant-feed.xml` comme source de données dans Google Merchant Center.

## Paiement Stripe

1. Importer `api/migrations/20261006_stripe_payments.sql` dans la base existante.
2. Dans Stripe, créer un webhook vers `https://kic-fr.com/api/payments/webhook/stripe`.
3. Sélectionner les événements `checkout.session.completed`, `checkout.session.expired` et `checkout.session.async_payment_failed`.
4. Copier la clé secrète de test et le secret de signature dans `api/.env`.
5. Effectuer une commande test avec la carte Stripe `4242 4242 4242 4242`, une date future et un CVC quelconque.
6. Vérifier que la commande passe automatiquement de `PENDING` à `PAID` dans le dashboard.

Les montants sont stockés en centimes d’euro. Les données de carte restent exclusivement chez Stripe.

## Sauvegardes automatiques

Le script `api/scripts/backup-database.php` crée une archive SQL compressée dans
`api/storage/backups/`. Ce dossier est bloqué au public et les archives de plus de
30 jours sont supprimées automatiquement.

Dans **hPanel → Avancé → Tâches Cron**, programmer une exécution quotidienne :

```text
0 2 * * * /usr/bin/php /home/VOTRE_COMPTE/domains/kic-fr.com/public_html/api/scripts/backup-database.php
```

Adapter le chemin à celui affiché par Hostinger. Télécharger régulièrement une
copie hors de l’hébergement et tester sa restauration dans une base séparée.
