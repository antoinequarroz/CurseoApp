# COUR-65 — Exercice de restauration des sauvegardes

## Story

En tant qu'equipe coursIA, nous voulons restaurer automatiquement chaque
sauvegarde chiffree dans une cible Supabase ephemere afin de prouver que les
donnees restent recuperables avant qu'un incident de production ne survienne.

## Criteres d'acceptation

- les sommes SHA-256 de l'artefact chiffre et des trois exports SQL sont
  verifiees avant la restauration ;
- les tables `storage.buckets_vectors` et `storage.vector_indexes`, gerees par
  Supabase, sont absentes du dump de donnees ;
- roles, schema et donnees sont restaures dans une transaction unique avec
  arret a la premiere erreur ;
- la cible est une pile Supabase vierge et ephemere, jamais la production ;
- au moins 48 tables publiques, toutes avec RLS, 50 recettes, un profil et un
  compte Auth sont verifies apres restauration ;
- aucun dump dechiffre ni aucune donnee personnelle ne sont publies dans les
  logs ou les artefacts ;
- la cible et les fichiers en clair sont detruits dans tous les cas ;
- le workflow ne s'execute automatiquement que pour une sauvegarde verte issue
  de `main`.

## Hors perimetre

- restauration destructive de la production ;
- restauration des fichiers binaires Supabase Storage ;
- activation ou achat du Point-in-Time Recovery ;
- correction des bugs fonctionnels de la recette TestFlight, reserves a
  COUR-63.
