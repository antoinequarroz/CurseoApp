# QA COUR-101 à COUR-104

## Automatisé

- Session active avant 30 minutes, expirée à 30 minutes et fermée sur date invalide.
- Politique d'activation fermée par défaut.
- Simulation autorisée seulement sans paiement ni transmission.
- Canary marchand bloqué sans conformité ou sans autorisation serveur.
- Kit de conformité vert sur le simulateur et rouge sur un faux connecteur transmis/non idempotent.
- Orchestrateur de démonstration refusant un connecteur marchand.

## Protocole appareil pour la prochaine release groupée

1. Préparer des paniers Migros et Coop, puis ouvrir le checkout.
2. Vérifier l'avertissement « aucun paiement » et les deux récapitulatifs.
3. Provoquer un échec simulé : vérifier les badges, le texte d'annulation et « Relancer la simulation ».
4. Relancer et vérifier l'absence de doublon puis la confirmation `SIM-*`.
5. Tester un brouillon vieux de plus de 30 minutes : le CTA doit être désactivé et « Actualiser mes paniers » visible.
6. Vérifier VoiceOver sur l'alerte, les statuts et les actions.
7. Vérifier un petit iPhone, un grand iPhone et le mode sombre.

## Limite

Aucune build TestFlight n'est déclenchée pour ce lot. Le test appareil reste documenté mais non exécuté.
