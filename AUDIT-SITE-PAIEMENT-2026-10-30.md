# Audit KIC : incohérences et paiement

Analyse du 30 octobre 2026, portant sur C:\wamp64\www\kic-main et des vérifications publiques en lecture seule de https://kic-fr.com. Aucune commande, connexion administrateur, demande de paiement ou modification de stock effectuée. Aucun secret affiché. Aucun correctif fonctionnel appliqué.

## Conclusion

Le site hébergé et son API fonctionnent pour les lectures vérifiées. Stripe est intégré dans le code, mais la fiabilité du parcours doit être améliorée avant de considérer le système de vente comme complètement validé. La disponibilité de /api/health ne prouve ni la validité des clés Stripe ni le bon fonctionnement du webhook.

Les priorités sont : stabiliser la reprise de commande, contrôler les confirmations de paiement, synchroniser annulations et réservations de stock, afficher le montant final avant redirection, clarifier la fiscalité affichée et retirer les archives de déploiement du public.

## Périmètre et preuves

- 20 pages HTML publiques locales analysées ; références locales href/src contrôlées : aucune cible de fichier manquante détectée. Ce contrôle ne valide pas tous les fragments, routes, fichiers référencés par CSS ou parcours dynamiques.
- PHP : 17 fichiers passent php -l.
- Test de sécurité existant : 8 contrôles réussis.
- Signature Stripe : 4 contrôles isolés réussis, sans requête Stripe.
- Scripts réels checkout.js, kic-api.js et confirmation.html exécutés avec des objets simulés, sans réseau ni base : anomalies de reprise, de messages d'erreur et de confirmation reproduites.
- En ligne : accueil, commande, confirmation, API health, config, catalogue et zones répondent en HTTP 200 au moment du contrôle.
- Les versions en ligne de commande.html, confirmation.html, checkout.js, kic-api.js, header-tools.js, contact.js et des pages catalogue/juridiques sélectionnées correspondent au contenu local, hors fins de ligne pour certains fichiers.
- Le backend PHP hébergé n'a pas été téléchargé ni inspecté sur le serveur : ses défauts internes ci-dessous sont établis sur la copie locale et doivent être rapprochés de la version déployée.
- Pas de test de paiement de bout en bout, de connexion au compte Stripe, de consultation des clients/commandes réels, de remboursement, de versement bancaire ou d'audit visuel exhaustif sur appareils.

## État observé en ligne et en local

| Élément | Constat |
| --- | --- |
| Site public hébergé | HTTP 200 |
| /api/health hébergé | status=ok ; la route effectue SELECT 1 sur MySQL |
| /api/config hébergé | EUR, paymentMethods=[STRIPE] ; déclaration de moyen de paiement, pas test de clés |
| Catalogue hébergé | Cinq produits et variantes disponibles |
| Clés Stripe hébergées | Non accessibles au public, validité et mode test/live non vérifiés |
| Configuration locale | api/.env absent, APP_KEY insuffisante, clé Stripe et secret webhook absents dans la configuration résolue |
| Base locale | Connexion du diagnostic impossible ; /kic-main/api/health répond HTTP 500 |
| Notification locale | Destinataire non configuré |

## Tarifs publiés par l'API au moment du contrôle

| Produit | Conditionnement | Prix affiché |
| --- | --- | --- |
| Beurre de cacao | 1 kg | 40,00 € |
| Poudre de cacao | 1 kg | 15,00 € |
| Masse de cacao | 1 kg | 25,00 € |
| Infusion de cacao | 15 sachets — 75 g | 12,00 € |
| Jus de cacao | 250 ml | 4,50 € |

Les zones publiées annoncent : retrait à Nice 0 €, France métropolitaine 12 €, Corse 22 €, Union européenne 28 €. Le présent tableau ne qualifie pas ces prix de HT ou de TTC, car le site laisse précisément cette question ouverte.

## Incohérences prioritaires

### 1. Reprise de commande : doublons et nouvelles réservations — priorité haute

Preuves : js/checkout.js, js/kic-api.js, api/src/commerce.php.

À chaque soumission, le navigateur réajoute tous les articles au panier API. Si une tentative s'interrompt avant la création de commande, le panier API peut déjà contenir certains articles : une nouvelle tentative les ajoute encore. Test simulé sur le script réel : un produit ajouté une fois devient deux unités après deux tentatives en échec.

Si la commande est créée mais que Stripe échoue ensuite, le panier local reste rempli. La nouvelle soumission crée une autre commande, avec une nouvelle clé d'idempotence et une nouvelle réservation. Test simulé : deux commandes pour deux échecs Stripe successifs. L'idempotence serveur existe, mais le navigateur change de clé à chaque appel.

Correction : maintenir une opération de commande et sa clé jusqu'à son issue, synchroniser le panier plutôt que réajouter sans comparaison, reprendre le paiement de la commande existante.

### 2. Page de succès non vérifiée — priorité haute

Preuve : confirmation.html, identique en ligne.

La page affiche « Paiement reçu / transmis », lit une commande en sessionStorage puis efface le panier local. Elle ne demande pas le statut réel à l'API et n'exploite pas session_id pour une vérification serveur. On peut y accéder directement sans payer. Le test isolé confirme l'effacement même avec une commande simulée PENDING.

Cela ne permet pas à lui seul de rendre une commande PAID dans la base : le défaut est une confirmation trompeuse côté interface. Correction : vérifier le statut authentifié de la commande, afficher « vérification en cours » si nécessaire et n'effacer le panier qu'après confirmation.

### 3. Montant avant paiement incomplet — priorité haute

Preuves : commande.html:61 et js/checkout.js.

Le « Total indicatif » additionne les prix conservés dans le navigateur. Les changements de zone et la saisie d'une remise ne recalculent pas ce total. Exemple sans promotion ni modification de prix : beurre à 40 € + France métropolitaine à 12 € = 52 € côté serveur, alors que le récapitulatif conserve 40 €. Stripe reçoit le total serveur : le problème est la différence entre le récapitulatif KIC et le montant final présenté chez Stripe.

Correction : faire calculer un devis panier par l'API et afficher produits, livraison, remise, taxes éventuelles et total final avant soumission.

### 4. Réservations de stock et expiration incompatibles — priorité haute

Preuves locales : api/src/payment.php:64, api/src/commerce.php:40, api/scripts/expire-orders.php.

La commande décrémente le stock avant le paiement. La session Stripe expire après 30 minutes. Le webhook d'expiration change uniquement payments.status et ne libère pas le stock de la commande. Le script de nettoyage vise des commandes PENDING de plus de sept jours, pas trente minutes.

En outre, expire-orders.php inclut security.php après bootstrap.php, qui l'inclut déjà avec require : le double chargement entraîne une redéclaration des fonctions. Ce constat vient du code ; le script n'a pas été exécuté pour éviter toute annulation réelle. Il ne possède pas non plus de garde CLI explicite. Une fois corrigé, il faut aussi le protéger contre l'appel HTTP et vérifier sa programmation cron.

Correction : gérer explicitement les réservations, les libérer après expiration vérifiée et programmer un nettoyage protégé et testé. La création de commandes n'a pas de limitation de fréquence dédiée visible dans cette copie ; des commandes non payées peuvent immobiliser les stocks.

### 5. Annulation et encaissement peuvent diverger — priorité haute

Preuves locales : api/index.php (annulation), api/src/security.php:49, api/src/payment.php:106.

L'annulation d'une commande PENDING remet le stock mais n'expire pas la session Stripe déjà créée. Un paiement ultérieur peut donc être confirmé pour une commande CANCELLED. Le webhook enregistre le paiement SUCCESS mais ne passe à PAID que les commandes encore PENDING. Aucun rapprochement ni remboursement automatique n'est prévu dans ce cas.

Correction : synchroniser annulation, expiration de session et confirmation du prestataire ; traiter explicitement les encaissements tardifs.

### 6. Plusieurs sessions Stripe pour une commande — priorité haute

Preuves locales : api/src/payment.php:39 et stripe_request().

Chaque appel de création de Checkout crée une nouvelle session pour une commande PENDING. Il n'y a ni réutilisation de session active ni en-tête Idempotency-Key transmis à Stripe. Deux liens peuvent rester payables ; un simple changement de statut local ne ferme pas l'autre session. Cela crée un risque de paiements multiples, non reproduit sur Stripe pendant cet audit.

Correction : réutiliser la session active, verrouiller la création et utiliser une clé d'idempotence stable côté Stripe. Référence : https://docs.stripe.com/api/idempotent_requests.

### 7. Calcul de livraison insuffisamment contrôlé — priorité haute

Preuves : commande.html:59 ; API locale create_order() et validate_checkout().

Le pays et la zone sont sélectionnés séparément, sans cohérence serveur vérifiée entre eux. La liste des pays contient aussi des destinations hors Union européenne alors que la zone internationale proposée est « Union européenne ». Le serveur accepte une zone active sans exclure la zone de retrait gratuit pour une demande DELIVERY ; la liste filtrée côté navigateur ne constitue pas un contrôle serveur.

Correction : déterminer et valider la zone depuis une adresse/pays autorisé, distinguer retrait et livraison côté serveur et recueillir le code postal, absent du formulaire et du modèle actuel.

### 8. Fiscalité commerciale laissée ouverte — priorité haute

Preuve : produits.html:234, identique en ligne : « La mention HT ou TTC reste à confirmer avant la mise en ligne commerciale. »

Le schéma et le calcul de commande ne ventilent ni base HT, ni taux ou montant de TVA. Le formulaire ne recueille pas les informations professionnelles nécessaires à d'éventuels traitements particuliers. Stripe reçoit un montant global sans configuration de taxe automatique dans cette intégration.

Correction : définir avec les informations comptables réelles le régime et l'affichage applicables, puis l'implémenter. Cet audit ne décide pas du régime fiscal de KIC et ne conclut pas à une infraction.

### 9. Archive de code accessible en production — priorité haute

Un HEAD sur /kic-seo-profile-20260924.zip renvoie 200. L'archive n'a pas été téléchargée depuis le serveur. La copie locale du même nom contient du code et api/schema.sql, sans fichier .env détecté dans sa liste. Il s'agit d'une exposition d'archive, pas d'une fuite de secrets démontrée.

/api/schema.sql renvoie correctement 403. /migration-kic-20261023.zip et /kic-video-remotion/package.json renvoient 404 au moment du contrôle.

Correction : sortir les archives et documents de travail de la racine publique et utiliser une liste de fichiers à publier.

## Autres incohérences fonctionnelles et commerciales

10. **Contact et compte client simulés.** js/contact.js ne transmet rien et réinitialise le formulaire. js/header-tools.js affiche des messages de connexion/inscription prêtes à être raccordées, sans authentification réelle. Le backend dispose pourtant d'authentification. Les commandes de cette boutique sont donc normalement invitées, sans liaison à un compte connecté par ce panneau.

11. **Messages d'erreur perdus.** Le PHP renvoie code/message/errors. kic-api.js cherche payload.detail. Le back-office exige aussi un format ProblemDetail avec status, detail et des erreurs sous forme de liste. Les raisons utiles, comme une configuration Stripe absente ou un stock insuffisant, sont remplacées par des erreurs génériques. Reproduit sur le script boutique réel.

12. **Facture et export annoncés sans route correspondante.** Le dashboard appelle /admin/orders/{number}/invoice et /admin/orders/export. Aucune route de génération PDF ou d'export CSV n'est définie dans l'API locale examinée. /admin/orders/export est susceptible d'être interprétée comme une recherche de commande nommée export. Une interface de téléchargement ne constitue pas une génération de facture.

13. **Remboursement administratif ≠ remboursement Stripe.** Le module retours peut seulement changer un statut. Il ne fait aucun appel à l'API Stripe de remboursement et le schéma de paiement n'a pas de statut de remboursement. Une demande marquée COMPLETED ne prouve donc pas le retour des fonds.

14. **Marquage PAID manuel.** L'administrateur peut faire passer PENDING à PAID sans encaissement prestataire associé. Le chiffre d'affaires du dashboard est calculé à partir du statut des commandes, pas exclusivement des transactions Stripe réussies. Un changement de statut n'effectue pas de débit bancaire.

15. **Succès de paiements différés non traité.** Le webhook local traite completed si payment_status=paid, expired et async_payment_failed, mais pas checkout.session.async_payment_succeeded. Cette lacune devient importante si les moyens de paiement configurés chez Stripe autorisent un règlement différé. La création de session ne fixe pas explicitement payment_method_types ; payments.method est néanmoins toujours enregistré CARD.

16. **Rapprochement financier limité.** Aucun stockage d'identifiant d'événement Stripe traité, de suivi de litige, de charge remboursée ni de tâche de rapprochement n'a été trouvé dans le code audité. Un événement pour une session inconnue est acquitté sans traitement. Plusieurs sessions sont possibles et order_response() affiche uniquement le dernier paiement créé, qui peut être en attente même si un autre a réussi.

17. **Promotion consommée avant encaissement.** used_count augmente à la création de commande ; les annulations/expirations ne le diminuent pas. Les remises en pourcentage sont arrondies vers le bas au multiple de cinq centimes : 10 % de 19,99 € donne 1,95 €, et non 2,00 €. Test de la fonction réelle effectué. Le code BIENVENUE10 existe dans data/commerce-config.json, mais le script de seed ne l'importe pas dans discount_codes.

18. **Notification de paiement client non démontrée.** Le code envoie éventuellement un message interne à la création de commande, avant encaissement. Aucun envoi client spécifique après webhook réussi ni génération de reçu KIC n'a été trouvé. Les reçus éventuellement activés directement dans Stripe sont hors de ce périmètre.

19. **Vente directe et devis mélangés.** Les fiches spécialisées privilégient WhatsApp/devis et une validation ultérieure ; le catalogue propose un panier et le paiement immédiat. Le récapitulatif conserve une note « sur devis » tout en proposant Payer. Le README affirme même qu'aucune passerelle n'est intégrée. Définir les références achetables immédiatement et les demandes de devis séparément.

20. **Photos et usages à clarifier.** La photo beurre-cacao-pub.png montre 250 g et la mention Cosmétique, tandis que l'offre est présentée en 1 kg pour des usages alimentaires. La poudre montre également 250 g pour une offre en 1 kg. Une note explicative existe sur certaines fiches mais ne résout pas la qualification alimentaire du lot. Conserver les marques réelles L'Or Brun et expliquer le rôle de KIC plutôt que présenter des emballages fictifs.

21. **Pages juridiques et professionnelles incomplètement renseignées.** Les mentions légales examinées indiquent une SAS, une adresse et un contact, mais pas de numéro d'immatriculation, de capital ou de numéro de TVA. Le site mélange cible professionnelle et dispositions consommateurs. Aucune page autonome de CGV ni acceptation dédiée n'apparaît dans les fichiers publics et le formulaire examinés. Compléter avec les informations réelles ; pas de conclusion juridique automatique.

22. **Parcours et identité visuelle non uniformes.** Le chargeur de page est inclus dans 5 pages sur 20 ; les fiches et pages éditoriales ont des en-têtes et outils différents. 24 liens absolus vers la racine sont repérés et doivent être revus pour une installation sous /kic-main/. Le manifeste utilise encore une autre variante de logo ; quelques alternatives textuelles comportent un point d'interrogation parasite.

23. **Sources de catalogue multiples.** Accueil et fiches contiennent des prix statiques, le catalogue utilise l'API et le flux Merchant revient au JSON d'initialisation si la base échoue. Cette solution de secours peut publier des stocks/prix anciens comme s'ils étaient actuels. Le flux construit aussi des liens /{slug} pour les produits créés par le dashboard alors que seuls cinq slugs ont une page spécialisée ; une nouvelle référence risque d'avoir un lien Merchant inexistant.

24. **Mesure d'achat mal positionnée.** confirmation.html appelle gtag avant le script différé analytics-consent.js, qui définit cette fonction. Dans le chargement normal, l'événement purchase est sauté. Il ne doit de toute façon partir qu'après vérification réelle du paiement et avec protection contre les répétitions. Le bandeau offre accepter/refuser, mais aucun mécanisme visible de réouverture des préférences n'a été trouvé.

25. **Exploitation et maintenance.** Plusieurs dossiers de builds administratifs coexistent. Le commentaire de l'environnement Angular prétend que le développement cible la production, alors que son fichier de développement cible localhost. Le code de stockage refresh token décrit un vrai jeton dans le JSON, tandis que le PHP renvoie seulement cookie et utilise un cookie HttpOnly : le comportement peut fonctionner, mais la documentation est périmée. Les images représentent environ 66 Mo, avec plusieurs PNG de plusieurs Mo ; dimensions et compression sont à optimiser. Une revue visuelle et de performance sur appareils reste nécessaire.

26. **Audit administratif incomplet.** Certaines routes d'enregistrement produits, variantes, catégories, zones et promotions répondent sans appeler audit_admin(). La modification du rôle n'applique pas les protections « dernier administrateur / soi-même » annoncées dans les commentaires du frontend. À vérifier et aligner avant de s'appuyer sur le journal comme trace exhaustive.

## Le paiement, étape par étape

1. Le catalogue lit produits, variantes, prix et stocks depuis l'API ; l'ajout se fait d'abord dans localStorage, clé kic.cart.items.
2. À la validation, checkout.js ajoute les lignes au panier API, identifié par X-Cart-Token.
3. POST /orders reçoit les coordonnées et une clé d'idempotence. Le serveur recalcule les prix depuis MySQL, ajoute la livraison, déduit la promotion, réserve le stock et crée une commande PENDING. Les prix envoyés depuis le navigateur ne sont pas utilisés comme autorité de facturation.
4. La réponse contient un accessToken HMAC propre à la commande, conservé en sessionStorage. Il autorise la demande de paiement d'une commande invitée via X-Order-Token.
5. POST /payments/stripe/checkout crée une session Stripe Checkout, en EUR, avec l'e-mail client et une seule ligne regroupant la commande entière. Le minimum contrôlé par l'application est de 50 centimes et la session dure trente minutes.
6. Le client est redirigé vers Stripe. Aucun formulaire de carte ni stockage PAN/CVC n'a été trouvé côté KIC. Le numéro de session, l'identifiant PaymentIntent, le montant et le statut sont en revanche enregistrés dans la table payments.
7. Stripe doit envoyer le webhook à /api/payments/webhook/stripe. Le code vérifie la signature et sa fraîcheur (cinq minutes), puis le montant et la devise. completed avec payment_status=paid passe le paiement à SUCCESS et la commande PENDING à PAID.
8. Le navigateur revient vers confirmation.html. Cette redirection n'est pas une preuve d'encaissement ; le webhook et les données serveur sont la référence à afficher.

### Ce qui est déjà bien conçu dans le code

- Prix et stock recalculés côté serveur, montants en centimes et transactions/verrous MySQL.
- Accès aux commandes invitées protégé par un jeton, droits administrateur contrôlés côté PHP.
- Signature webhook et comparaison montant/devise, sans dépendre de la seule URL de retour.
- Cookies de rafraîchissement HttpOnly/SameSite, hachage de mots de passe, limitation de fréquence pour connexion et création de session Stripe.
- Pas de secret Stripe publié par /api/config.

Ces points positifs ne corrigent pas les incohérences de cycle de vie relevées plus haut.

### Ce que cet audit ne permet pas d'affirmer

La présence de Stripe dans /api/config ne confirme pas : mode live, activation du compte, clés valides, livraison des webhooks, moyens réellement disponibles dans Checkout, frais facturés au compte KIC, reçus automatiques ou arrivée des fonds sur le compte bancaire. Ces points nécessitent une lecture du compte Stripe et un parcours de test autorisé. Aucun virement, paiement mobile ou PayPal spécifique n'a été identifié dans cette intégration ; les moyens dynamiques de Checkout dépendent aussi des réglages Stripe.

Le dashboard KIC ne gère pas les versements Stripe vers la banque. Le statut PAID d'une commande n'est ni un relevé bancaire ni une confirmation de versement. Il faut rapprocher commande KIC, session/PaymentIntent Stripe et versement du prestataire.

## Ordre de correction proposé

1. Retirer l'archive publique, rendre le total final explicite et clarifier HT/TTC et identité des produits.
2. Stabiliser panier, clé d'idempotence, commande et réutilisation de Checkout lors des reprises.
3. Vérifier le paiement à la confirmation ; synchroniser annulations, expirations, stocks et promotions.
4. Distinguer statut logistique, encaissement et remboursement ; compléter les événements Stripe et le rapprochement.
5. Raccorder contact/compte, factures/exports et notifications ; uniformiser les erreurs API et compléter les informations commerciales.
6. Exécuter en environnement de test les scénarios : succès, refus, abandon, double clic, coupure réseau, reprise, webhook répété/retardé, paiement après annulation, expiration et remboursement. Les tests impliquant Stripe ou des commandes n'ont pas été exécutés ici.
