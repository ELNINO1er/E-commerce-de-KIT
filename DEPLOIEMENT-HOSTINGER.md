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
