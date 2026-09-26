<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Ce script doit être exécuté depuis la ligne de commande.\n");
    exit(1);
}

$config = require dirname(__DIR__) . '/config.php';
$db = $config['db'];
$dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $db['host'], $db['port'], $db['name']);
$pdo = new PDO($dsn, $db['user'], $db['password'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

$backupDirectory = dirname(__DIR__) . '/storage/backups';
if (!is_dir($backupDirectory) && !mkdir($backupDirectory, 0700, true) && !is_dir($backupDirectory)) {
    throw new RuntimeException('Impossible de créer le dossier de sauvegarde.');
}

$filename = sprintf('%s/kic-%s.sql.gz', $backupDirectory, gmdate('Y-m-d-His'));
$stream = gzopen($filename, 'wb9');
if ($stream === false) {
    throw new RuntimeException('Impossible de créer le fichier de sauvegarde.');
}

gzwrite($stream, "-- Sauvegarde KIC générée le " . gmdate(DATE_ATOM) . "\n");
gzwrite($stream, "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n");

$tables = $pdo->query('SHOW FULL TABLES WHERE Table_type = \'BASE TABLE\'')->fetchAll(PDO::FETCH_COLUMN);
foreach ($tables as $table) {
    $quotedTable = '`' . str_replace('`', '``', (string) $table) . '`';
    $create = $pdo->query("SHOW CREATE TABLE $quotedTable")->fetch(PDO::FETCH_NUM);
    gzwrite($stream, "DROP TABLE IF EXISTS $quotedTable;\n" . $create[1] . ";\n\n");

    $rows = $pdo->query("SELECT * FROM $quotedTable");
    while ($row = $rows->fetch(PDO::FETCH_ASSOC)) {
        $columns = implode(', ', array_map(
            static fn(string $column): string => '`' . str_replace('`', '``', $column) . '`',
            array_keys($row)
        ));
        $values = implode(', ', array_map(
            static fn(mixed $value): string => $value === null ? 'NULL' : $pdo->quote((string) $value),
            array_values($row)
        ));
        gzwrite($stream, "INSERT INTO $quotedTable ($columns) VALUES ($values);\n");
    }
    gzwrite($stream, "\n");
}

gzwrite($stream, "SET FOREIGN_KEY_CHECKS=1;\n");
gzclose($stream);

// Conservation glissante de 30 jours.
$cutoff = time() - (30 * 86400);
foreach (glob($backupDirectory . '/kic-*.sql.gz') ?: [] as $oldBackup) {
    if (filemtime($oldBackup) < $cutoff) {
        unlink($oldBackup);
    }
}

echo "Sauvegarde créée : $filename\n";
