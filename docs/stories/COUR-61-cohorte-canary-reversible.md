# COUR-61 — Cohorte canary réversible

## Story

En tant qu'équipe CoursIA, nous voulons ouvrir les prix live à quelques comptes
Standard+ explicitement autorisés afin de valider le parcours réel sans exposer
l'ensemble des abonnés ni dépendre d'une nouvelle build mobile.

## Critères d'acceptation

- le serveur possède trois modes explicites `off`, `canary` et `on` ; toute
  valeur absente ou invalide est fermée par défaut ;
- le mode `canary` accepte uniquement les UUID issus de la session Supabase
  Auth et présents dans une cohorte serveur secrète de 1 à 10 comptes ;
- un compte Gratuit reste refusé même s'il appartient à la cohorte ;
- un compte Standard+ hors cohorte reçoit la même indisponibilité qu'un serveur
  désactivé, sans révéler l'existence du canary ;
- l'activation exige licence, canary technique, benchmark terrain et
  confirmation humaine non ambiguë ;
- le code Edge est déployé en mode `off` avant le passage à `canary` ;
- le flag historique reste à `false`, de sorte qu'une ancienne révision Edge
  reste fermée pendant une restauration ;
- monitoring et arrêt manuel remettent les deux coupe-circuits à l'arrêt ;
- le flag Expo mobile reste inchangé ;
- aucune activation distante n'est exécutée avant validation de la licence.

## Hors périmètre

- ouverture générale du mode `on` ;
- activation en production ou publication TestFlight ;
- gestion libre-service de la cohorte ;
- promesse de disponibilité, stock ou exactitude commerciale des prix.
