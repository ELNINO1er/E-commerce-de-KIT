# KIC — e-commerce professionnel

Plateforme e-commerce B2B de **KIC — Konan Industrie et Chocolaterie**, destinée aux professionnels en France et en Europe.

## Architecture

- Boutique publique HTML/CSS/JavaScript : design KIC historique conservé.
- Commande avec paiement Stripe en sandbox : `commande.html`.
- Dashboard Angular 21 compilé dans `admin/` et accessible à `/admin/`.
- API PHP/MySQL compatible avec un hébergement mutualisé Hostinger : `api/`.
- Catalogue et zones françaises d'initialisation : `data/`.

## Démarrage local

1. Importer `api/schema.sql` dans une base MySQL `kic`.
2. Copier `api/.env.example` vers `api/.env` et renseigner les accès.
3. Exécuter `php api/scripts/seed.php`.
4. Créer un administrateur avec `php api/scripts/create-admin.php email mot-de-passe Prenom Nom`.
5. Ouvrir `http://localhost/kic-main/` et `http://localhost/kic-main/admin/`.

## Dashboard source

```powershell
cd dashboard
npm install
npm run build
```

Le paquet publié est compilé avec une base `/admin/`. Voir `DEPLOIEMENT-HOSTINGER.md`.

## Commerce

Les prix sont stockés en centimes d'euro. Stripe Checkout fonctionne en sandbox par défaut ; les clés de test et le webhook sont nécessaires. Les cartes sont saisies chez Stripe. Voir PAIEMENT-SANDBOX.md pour les migrations, les tests et le futur passage en production.
