# Déploiement KIC sur Hostinger

## Contenu publié

- Boutique : racine `public_html`
- Dashboard : `https://kic-fr.com/admin/`
- API PHP : `https://kic-fr.com/api/`
- Base : MySQL Hostinger, schéma `api/schema.sql`

## Configuration privée

Créer `public_html/api/.env` depuis `api/.env.example`. Renseigner `APP_KEY`, `DB_NAME`, `DB_USER` et `DB_PASSWORD`. Le fichier est bloqué par Apache et ignoré par Git.

## Initialisation

1. Importer `api/schema.sql` dans phpMyAdmin.
2. Exécuter une fois `php api/scripts/seed.php` ou appeler le script avec PHP depuis le terminal Hostinger.
3. Créer l’administrateur avec `php api/scripts/create-admin.php email mot-de-passe Prenom Nom`.
4. Vérifier `https://kic-fr.com/api/health`.
5. Ouvrir `https://kic-fr.com/admin/`.

Aucune table ni passerelle de paiement n’est utilisée. Les montants sont stockés en centimes d’euro.
