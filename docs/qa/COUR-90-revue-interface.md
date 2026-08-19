# COUR-90 — Revue d'interface consolidée

## Périmètre et couverture

Parcours revu : panier optimisé → contrôle des correspondances → remplacement → choix des créneaux → simulation → récapitulatif.

La revue couvre les états normal, chargement, erreur, vide, avertissement et blocage. Elle applique les primitives et tokens existants de coursIA, sans introduire de nouveau langage visuel.

## Constats traités

- Une correspondance automatique incertaine bloque le passage au checkout jusqu'à une validation explicite.
- La sélection d'une substitution n'a aucun effet tant que le bouton de confirmation n'a pas été activé.
- La confirmation explicite du remplacement vaut validation : aucune seconde confirmation redondante n'est demandée dans le panier.
- Le coût, le nombre de paquets, le changement d'enseigne et les limites de format sont visibles avant confirmation.
- Chaque enseigne conserve son propre groupe de créneaux simulés, avec rôles radio, état coché et cible tactile d'au moins 48 px.
- Les alertes comportent du texte et une sémantique accessible ; aucune information ne repose uniquement sur la couleur.
- Les montants utilisent les composants typographiques existants et les chiffres tabulaires lorsqu'ils sont alignés.
- Tous les libellés rappellent qu'il s'agit d'une simulation sans débit ni transmission aux enseignes.

## Solutions considérées puis écartées

- Bloquer une disponibilité inconnue : écarté, car la source prototype ne peut pas confirmer un stock marchand. L'information reste un avertissement visible.
- Fusionner automatiquement les doublons possibles : écarté, car deux besoins issus de recettes différentes peuvent être intentionnels.
- Imposer silencieusement le créneau préféré du profil : écarté. Il est présélectionné, mais le testeur garde un choix explicite par enseigne.

## Vérification

- Tests automatisés : correspondance, quantités, substitution, réconciliation, créneaux et parcours multi-enseignes complet.
- Bundle Expo iOS produit avec succès pour SDK 57.
- Test manuel iOS natif : à réaliser sur l'iPhone d'Antoine via TestFlight, selon `docs/qa/COUR-90-protocole-testflight.md`. Aucun simulateur iOS n'est disponible sur cette machine Windows.

## Verdict

**Approuvé pour le prototype TestFlight**, sous réserve du test manuel documenté. Le parcours est cohérent, accessible et honnête sur son caractère simulé ; il ne doit pas être présenté comme une commande marchande réelle.
