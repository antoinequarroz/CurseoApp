# QA COUR-95 à COUR-100

## Automatisé

- Deux enseignes réussissent indépendamment puis autorisent le paiement simulé.
- Une erreur temporaire est rejouée une fois.
- Un échec permanent annule les paniers déjà prêts.
- Un paiement vide, transmis ou dupliqué est refusé.
- Les références restent `SIM-*` et `PAY-DEMO-*`.
- La télémétrie ne contient aucun produit, email ou adresse.
- Le récapitulatif affiche les enseignes et l'état de chaque créneau.

## Protocole appareil pour la prochaine release groupée

1. Préparer une liste entièrement résolue chez Migros et Coop.
2. Choisir l'adresse et un créneau par enseigne.
3. Vérifier le récapitulatif, le total et l'unique action de validation.
4. Exécuter la simulation et vérifier une référence `PAY-DEMO-*` puis deux références `SIM-*`.
5. Confirmer partout qu'aucun débit et aucune transmission ne sont annoncés.
6. Simuler un produit non confirmé : le checkout doit rester bloqué.

## Limite

Aucune build TestFlight n'est déclenchée pour ce lot. Le test appareil reste donc documenté mais non exécuté.
