# ADR 008 — Historique Supabase partagé avec le back-office

## Statut

Accepté le 19 août 2026 dans COUR-66.

## Contexte

Le projet Supabase de production contient neuf versions datées du 28 juillet
2026 absentes du dépôt mobile. Elles ont été appliquées par un back-office qui
partage le même projet et mélangent trois catégories :

- sécurité et index des tables mobiles ;
- formulaires publics exploités uniquement côté serveur ;
- objets d'administration et de médias qui ne sont ni créés ni consommés par
  l'application mobile.

Cette divergence bloquait tout `supabase db push`. Importer aveuglément les
fichiers distants cassait aussi un `supabase db reset`, car deux migrations
dépendent d'objets dont le schéma source n'existe pas dans ce dépôt.

## Décision

- conserver sous leur timestamp exact les migrations qui affectent coursIA ;
- rejouer intégralement leurs policies RLS, durcissements, tables serveur et
  index appartenant au schéma mobile ;
- représenter les deux migrations exclusivement administratives par un
  marqueur SQL neutre et documenté ;
- conserver uniquement la partie mobile de la migration d'index mixte ;
- vérifier fonctionnellement en CI les refus `anon`, les accès `service_role`
  et la lecture publique du catalogue ;
- interdire dorénavant toute modification distante non versionnée dans le
  dépôt qui possède l'objet concerné.

Le contenu SQL d'un marqueur n'est pas présenté comme la définition du
back-office. Son timestamp reconnaît seulement une version déjà présente dans
l'historique partagé afin que les migrations mobiles suivantes puissent être
déployées sans modifier ni falsifier l'état distant.

## Conséquences

- le schéma mobile est à nouveau reconstructible depuis une base vide ;
- les migrations futures de coursIA peuvent être poussées normalement ;
- le back-office reste responsable de rendre son propre schéma reproductible ;
- à moyen terme, chaque produit devrait utiliser un projet Supabase distinct ou
  un processus de migrations commun afin d'éviter une nouvelle divergence.
