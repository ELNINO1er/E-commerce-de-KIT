# Montage KIC — camion et cinq produits

Montage vertical 1080 × 1920, 30 images/seconde, durée 14 secondes.

Le début utilise la vidéo Pub0001.mp4 fournie par le client. Le choc et le départ des cartons restent ceux du fichier source. Les cinq produits apparaissent ensemble à 3,1 secondes, puis restent visibles avec le logo et les contacts. Les photos originales sont conservées dans public/products : aucune étiquette ni marque n'a été régénérée. Des silhouettes CSS masquent les fonds autour des emballages. Le filigrane déjà présent dans la séquence d'origine est conservé.

Coordonnées : +33 7 45 90 87 78 ; service@kic-fr.com ; kic-fr.com ; 18 rue Masséna, 06000 Nice, France.

## Aperçu

```powershell
npx remotion studio --no-open --port=3101
```

Ouvrir http://localhost:3101/KIC-Camion-Produits.

## Export

```powershell
npx remotion render KIC-Camion-Produits ../publicite-kic/KIC-camion-produits.mp4 --codec=h264 --crf=18 --pixel-format=yuv420p --concurrency=2 --port=3111
```

Le port explicite évite un conflit avec les autres applications locales. Le fichier prepare-audio.py génère un bref effet d'impact original ; le son du début provient de la vidéo fournie.
