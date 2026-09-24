<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
if (PHP_SAPI!=='cli') fail(403,'FORBIDDEN','Execution en ligne de commande uniquement.');
[$script,$email,$password,$firstName,$lastName]=array_pad($argv,5,null);
if (!$email||!$password||!$firstName||!$lastName) {fwrite(STDERR,"Usage: php scripts/create-admin.php email mot-de-passe prenom nom\n");exit(1);}
if (strlen($password)<12) {fwrite(STDERR,"Le mot de passe administrateur doit contenir au moins 12 caracteres.\n");exit(1);}
$q=db()->prepare("INSERT INTO users(email,password_hash,first_name,last_name,role) VALUES(?,?,?,?,'ADMIN') ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash),first_name=VALUES(first_name),last_name=VALUES(last_name),role='ADMIN',enabled=1");
$q->execute([strtolower($email),password_hash($password,PASSWORD_DEFAULT),$firstName,$lastName]);echo "Compte administrateur cree ou mis a jour.\n";

