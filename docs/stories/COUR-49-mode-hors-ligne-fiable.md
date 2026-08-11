# COUR-49 — Mode hors-ligne fiable

## Story

En tant qu'utilisateur, je veux retrouver mes recettes, mon planning et ma
liste de courses sans réseau, afin de continuer à organiser ma semaine et de
faire mes courses sans perdre mes changements.

## Critères d'acceptation

- [x] Le catalogue et les semaines consultées sont conservés sept jours sur l'appareil.
- [x] La liste de courses reste persistée dans son store existant.
- [x] Assigner, remplacer, ignorer ou retirer un repas fonctionne hors ligne.
- [x] Une seule intention finale est conservée par créneau.
- [x] Les changements sont rejoués au retour du réseau et retirés de la file seulement après confirmation du serveur.
- [x] La déconnexion vide cache et file locale pour éviter toute fuite entre comptes.
- [x] Le nombre de changements en attente est visible sans interrompre le parcours.

## Choix technique

Les lectures utilisent le cache persistant React Query. Les écritures utilisent
une petite file Zustand/AsyncStorage propre au planning. Aucun nouveau schéma
Supabase n'est nécessaire et l'interface garde la même source de vérité.

