-- Sauvegarder la base avant application. Ne pas relancer si la colonne existe.
-- Le script migrate.php --apply vérifie la présence des colonnes avant ajout.
ALTER TABLE orders ADD COLUMN tax_snapshot TEXT NULL;
