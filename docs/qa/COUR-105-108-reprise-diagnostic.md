# QA COUR-105 à COUR-108

## Automatisé

- Persistance des états `en_cours`, `echec` et de la référence `CHK-*`.
- Classification entre relance et correction du panier.
- Neutralisation d'un message contenant un email et un faux token.
- Timeout Coop déterministe, deux essais et annulation de Migros.
- Panier Migros partiel et paiement global interdit.

## Protocole appareil pour la prochaine release groupée

1. Démarrer une simulation puis tuer l'application pendant le chargement.
2. Rouvrir le checkout : vérifier « La simulation a été interrompue » et l'action de reprise.
3. Déclencher le scénario timeout en environnement de développement : vérifier la référence `CHK-*` et « Relancer la simulation ».
4. Déclencher le panier partiel : vérifier que l'action renvoie au panier.
5. Activer VoiceOver et vérifier l'annonce de l'alerte, des statuts et de la référence.
6. Vérifier petit/grand iPhone et mode sombre.

## Limite

Aucune build TestFlight n'est déclenchée. Les scénarios de panne ne sont volontairement pas activables depuis l'application publique.
