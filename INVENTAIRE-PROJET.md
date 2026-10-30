# Inventaire technique KIC

Analyse du code local réalisée le 24 octobre 2026. Aucun changement fonctionnel effectué. Les dépendances et fichiers compilés sont inventoriés, sans revue ligne par ligne de leur contenu généré. Aucun secret de configuration consulté.

## Architecture

KIC est une boutique de cacao destinée aux professionnels en France et en Europe. Trois applications coopèrent : boutique HTML/CSS/JavaScript, API PHP avec PDO/MySQL, administration Angular 21.2 avec TypeScript 5.9 et RxJS 7.8. Apache assure les réécritures et les en-têtes HTTP. Le déploiement documenté cible Hostinger et kic-fr.com.

| Emplacement | Rôle | Inventaire |
| --- | --- | --- |
| Racine | Boutique et contenu éditorial | 20 pages HTML |
| css/ | Styles publics | 7 fichiers |
| js/ | Interactions publiques | 11 fichiers |
| api/ | Routage, métier, schéma, scripts, tests | 25 fichiers dont 17 PHP |
| dashboard/src/ | Sources du back-office | Composants, services, stores, modèles et repositories |
| admin/ | Back-office compilé | 346 fichiers, environ 5,21 Mo, avec sous-dossier browser |
| admin-build*, quatre dossiers | Autres sorties de compilation | 70 fichiers et environ 1,79 Mo par dossier |
| data/ | Catalogue et configuration d'initialisation | 2 fichiers JSON |
| img/ | Identité et visuels produits | 36 fichiers, environ 65,99 Mo |
| publicite-kic/ | Ressources publicitaires | 13 fichiers |
| .tmp-video-analysis/ | Ressources temporaires | 7 fichiers |

Le dossier dashboard contient également les dépendances locales : son total de 22 974 fichiers et 232,53 Mo ne représente pas uniquement le code applicatif.

## Boutique et parcours

- Accueil : index.html ; catalogue : produits.html ; fiche dynamique : produit.html.
- Cinq pages dédiées : beurre, poudre, masse, infusion et jus de cacao.
- Achat : commande.html puis confirmation.html ; panier côté navigateur et panier API ; création de commande puis redirection Stripe Checkout.
- Contenus professionnels : conseils, conservation, comparaison des produits, achat en quantité, fiche technique et fournisseur en France.
- Contact, confidentialité, mentions légales et livraison/retours.
- Référencement : sitemap.xml, robots.txt, données structurées et flux Merchant XML généré par merchant-feed.php.
- Identité : img/Logo KIC 01.png est déjà utilisé dans les en-têtes, pieds de page et écrans de chargement des pages examinées. Le dashboard référence images/kic-logo.png.
- Chargement : js/page-loader.js gère l'affichage initial, le retour par historique et une transition de navigation de 180 ms ; délai de secours de 2,5 secondes ; prise en compte de la réduction des animations.

## API et données

api/index.php charge bootstrap, authentification, catalogue, commerce, paiement et modules administratifs. Les routes couvrent santé, sessions, profil, catalogue, catégories, livraison, promotions, panier, commandes, suivi, newsletter et alertes de stock. Le back-office dispose de routes administratives complémentaires.

Le schéma contient 19 tables : users, refresh_tokens, categories, products, product_variants, delivery_zones, discount_codes, carts, cart_items, orders, order_items, payments, addresses, returns, reviews, newsletter_subscribers, stock_alerts et audit_logs.

Les prix sont exprimés en centimes d'euro. La commande réserve les stocks dans une transaction, utilise une clé d'idempotence et fournit un jeton d'accès. Stripe dispose d'une création de session et d'un webhook avec validation de signature. Le code comporte des protections de rôle, du hachage de mots de passe, des requêtes préparées, des jetons de session et des limitations de fréquence. Leur présence ne constitue pas un audit de sécurité complet.

Les scripts servent à initialiser les données, créer un administrateur, expirer les commandes et sauvegarder la base.

## Administration

Modules : connexion, indicateurs, produits et variantes, catégories, commandes et détail, retours, promotions, zones de livraison, clients, recherche globale et journal d'audit. Routes protégées par adminGuard, composants chargés à la demande. Traductions françaises et anglaises présentes.

Les sources à modifier sont dans dashboard/src ; admin/ contient les fichiers produits par compilation. La configuration de développement pointe vers localhost/kic-main/api ; celle de production vers https://kic-fr.com/api.

## Points à traiter

1. Documentation contradictoire : README.md annonce une commande sans paiement en ligne ; checkout.js et l'API intègrent Stripe. Le commentaire de environment.ts affirme aussi que le développement cible la production, alors que environment.development.ts cible localhost.
2. Contact incomplet : js/contact.js intercepte le formulaire et affiche explicitement que l'envoi réel reste à raccorder au serveur.
3. Reprise de paiement à vérifier : checkout.js réajoute les articles locaux au panier API à chaque soumission et crée une nouvelle clé d'idempotence par appel. Un échec intermédiaire peut laisser un panier partiel ou une commande réservée ; une reprise exige des tests ciblés.
4. Plusieurs copies compilées : déterminer la version effectivement déployée avant tout nettoyage. Aucun fichier supprimé pendant cette analyse.
5. Identité à harmoniser : le manifeste utilise encore logo-kic-transparent.png ; plusieurs variantes du logo coexistent. Certaines alternatives textuelles présentent un point d'interrogation à la place d'un séparateur.
6. Performances : plusieurs PNG pèsent entre 2,5 et 3,37 Mo. Étudier compression, formats modernes et dimensions adaptées avant généralisation du nouveau design.
7. Déploiement sous un sous-dossier : certaines réécritures et URL absolues sont orientées vers la racine du domaine ; vérifier les parcours locaux /kic-main/, les URL sans extension et la base du back-office.
8. Archives présentes à la racine : vérifier leur nécessité et leur accès HTTP avant publication, notamment les ZIP de migration. Aucune exposition confirmée par cette analyse statique.

## Vérifications réalisées et limites

- Test api/tests/security-test.php : 8 contrôles réussis, sans réseau ni données client.
- Syntaxe : 17 fichiers PHP vérifiés avec php -l et 11 scripts publics vérifiés avec node --check, sans erreur signalée.
- Git avant analyse : deux éléments non suivis, migration-kic-20261023.zip et migration-kic-20261023-verification.csv ; conservés.
- Pas de modification de base, de commande, de paiement ou de déploiement.
- Non vérifiés à ce stade : disponibilité MySQL, contenu réel de la base, clés et connectivité Stripe, compilation Angular, rendu visuel mobile et bureau, parcours réels de bout en bout et accessibilité complète.

## Repères pour les prochains changements visuels

Styles généraux et chargement : css/kic.css et js/page-loader.js. En-tête et panier : css/header-tools.css et js/header-tools.js. Catalogue : css/produits.css et js/produits.js. Fiches : css/product-detail.css, js/produit.js et js/product-commerce.js. Commande : css/commerce.css et js/checkout.js. Administration : dashboard/src/styles.scss, layout/dashboard-shell et features/auth/presentation/login-page. Les blocs HTML publics étant répétés, toute harmonisation doit être vérifiée sur les 20 pages.
