# COUR-74 — Paiement strictement simulé

## Story

En tant que testeur, je veux valider le checkout une seule fois afin de vérifier
l'expérience d'un paiement unifié, sans débit réel.

## Critères d'acceptation

- l'écran indique en permanence qu'aucun débit n'aura lieu ;
- aucune carte, donnée bancaire ou clé de paiement n'est demandée ou stockée ;
- la confirmation crée une référence locale préfixée `DEMO-` ;
- le bouton répète la conséquence : « Simuler le paiement » ;
- un double appui ne crée pas deux commandes.

## Décision

Stripe n'est pas intégré à ce ticket : un vrai PaymentIntent demanderait une
configuration externe et apporterait un risque inutile à une démonstration. Le
futur adaptateur de paiement pourra remplacer le simulateur sans changer l'UX.
