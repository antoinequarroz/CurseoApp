# COUR-66 — Réconcilier l'historique Supabase partagé

## Story

En tant qu'équipe coursIA, nous voulons que l'historique local reconnaisse les
versions déjà appliquées au projet Supabase partagé, afin de déployer les
correctifs mobiles sans supprimer de données ni casser la reconstruction locale.

## Critères d'acceptation

- les neuf timestamps distants du 28 juillet existent dans le dépôt ;
- les changements RLS et index concernant coursIA sont réellement rejoués ;
- les dépendances exclusivement administratives sont isolées et documentées ;
- un `supabase db reset --local` complet réussit ;
- les tables serveur refusent `anon` mais restent accessibles à
  `service_role` ;
- les parcours avec de vrais comptes authentifiés restent verts ;
- `supabase migration list --linked` est aligné après déploiement ;
- la correction du visuel du wrap est appliquée et vérifiée en production ;
- aucune nouvelle build TestFlight n'est créée pour ce ticket backend.
