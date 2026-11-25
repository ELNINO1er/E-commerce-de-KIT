# Passage du paiement KIC en production

Le compte Stripe est actif au 24 novembre 2026. Cela ne bascule pas automatiquement le site en production.

## Configuration sur l'hébergement

Sauvegarder le site, la base et le fichier privé `api/.env`. Conserver les accès MySQL et l'APP_KEY existants. Reporter les paramètres de `api/.env.production.example` dans ce fichier privé, avec la clé secrète du compte Stripe de production KIC. Ne jamais copier une clé dans le JavaScript, le dépôt ou un message.

KIC a confirmé le 24 novembre 2026 : prix TTC, TVA à 5,5 % pour tous les produits, livraison comprise en France métropolitaine et Corse uniquement. Configurer `PRICE_TAX_MODE=TTC`, `VAT_RATE_BPS=550`, `DELIVERY_INCLUDED_FRANCE=true`. Les tarifs UE restent séparés. Les 10 % indiqués représentent une composante du prix, pas un supplément ni un taux de TVA. Le numéro communiqué par Jonathan le 25 novembre 2026 est `FR79100105154`, à renseigner dans `SELLER_VAT_NUMBER`. La clé numérique concorde avec le SIREN ; le statut VIES reste non vérifié. Ces informations sont celles transmises par KIC, pas une validation fiscale indépendante. Compléter et valider les conditions de vente et les tarifs effectifs avant `SALES_TERMS_CONFIRMED=true`. Le modèle laisse ces deux points bloquants tant qu'ils ne sont pas confirmés.

## Confirmation des paiements

Dans Stripe en production, configurer une destination webhook vers :

`https://kic-fr.com/api/payments/webhook/stripe`

Événements traités par l'intégration :

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`

Placer le secret de signature de CETTE destination de production dans `STRIPE_WEBHOOK_SECRET`. Le secret de test ne convient pas.

## Vérification avant ouverture

Depuis le serveur, exécuter :

```sh
php api/scripts/migrate.php --check
php api/scripts/check-payment-readiness.php --strict --production --stripe
```

La seconde commande lit le compte Stripe sans créer de paiement et n'affiche aucun secret. Elle doit sortir avec le code 0. Un schéma incomplet exige une sauvegarde puis une migration adaptée ; ne jamais réimporter le seed dans une boutique existante.

Programmer `api/scripts/expire-orders.php` toutes les cinq minutes pour réconcilier les réservations expirées. Le chemin absolu dépend de l'hébergement.

Vérifier que `/api/config` répond avec `paymentMode=live`, `paymentReady=true` et le bon `taxMode`. Le bouton devient automatiquement « Payer ma commande » : aucun remplacement artificiel des mentions de test n'est nécessaire.

Contrôler ensuite le total, la livraison, la redirection vers Stripe et le retour de commande. Un paiement réel de recette doit être réalisé par le titulaire avec un montant convenu. Vérifier dans Stripe la réception du webhook (réponse 2xx) et, dans KIC, le passage à PAID avec le même montant EUR. Une simple redirection ne prouve pas le paiement. Ne pas utiliser une carte de test en production.

## Retour arrière

En cas d'incident, désactiver les nouveaux paiements avec `PAYMENTS_ENABLED=false` tout en conservant le mode live, les clés et le webhook pour recevoir les événements des paiements déjà lancés. Ne pas supprimer les commandes ni changer leur environnement.

## Conservation de la TVA

Chaque nouvelle commande conserve son détail HT, TVA et TTC ainsi que le numéro de TVA dans `orders.tax_snapshot`. Le calcul porte sur le total TTC après remise et livraison. Les anciennes commandes restent sans détail fiscal ajouté a posteriori. Déployer ensemble le code et la migration `20261124_tax_snapshot.sql` (ou `migrate.php --apply` après sauvegarde) avant d’activer le paiement. Pour une nouvelle destination ou un changement fiscal, faire confirmer les règles avant modification.
