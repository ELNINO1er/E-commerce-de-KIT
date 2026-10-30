<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$root=dirname(__DIR__,2);$out=$root.'/api/storage/releases';
if(!is_dir($out))mkdir($out,0700,true);
if(!class_exists('ZipArchive')){fwrite(STDERR,"Extension ZIP PHP requise.\n");exit(1);}
$filename=$out.'/kic-release-'.gmdate('Ymd-His').'.zip';$zip=new ZipArchive();$zip->open($filename,ZipArchive::CREATE|ZipArchive::EXCL);
$add=function(string $path,string $name)use($zip){if(!is_file($path))throw new RuntimeException('Fichier manquant : '.$name);$zip->addFile($path,$name);};
foreach(glob($root.'/*.html') as $file)$add($file,basename($file));
foreach(['.htaccess','robots.txt','sitemap.xml','site.webmanifest','merchant-feed.php'] as $name)$add($root.'/'.$name,$name);
foreach(['css','js','img','data'] as $dir)foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root.'/'.$dir,FilesystemIterator::SKIP_DOTS)) as $file){if($file->isFile()&&!preg_match('/\.(?:md|zip|log|csv)$/i',$file->getFilename()))$add($file->getPathname(),$dir.'/'.str_replace('\\','/',substr($file->getPathname(),strlen($root.'/'.$dir)+1)));}
foreach(['api/index.php','api/config.php','api/.htaccess','api/schema.sql','api/storage/.htaccess'] as $name)$add($root.'/'.$name,$name);
foreach(['api/src','api/scripts','api/migrations'] as $dir)foreach(glob($root.'/'.$dir.'/*') as $file)if(is_file($file))$add($file,$dir.'/'.basename($file));
$admin=$root.'/admin-build-readiness/browser';
if(!is_file($admin.'/index.html')){fwrite(STDERR,"Compilez le dashboard dans admin-build-readiness avant de préparer la publication.\n");$zip->close();exit(1);}
foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($admin,FilesystemIterator::SKIP_DOTS)) as $file)if($file->isFile())$add($file->getPathname(),'admin/'.str_replace('\\','/',substr($file->getPathname(),strlen($admin)+1)));
$zip->close();echo "Paquet préparé sans .env, sauvegardes, vidéos, tests ni archives de travail : $filename\n";
