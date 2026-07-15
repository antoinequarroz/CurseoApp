# ADR-002 : Supabase plutôt que Firebase

## Statut : Accepté

## Contexte

Le MVP a besoin d'une base de données relationnelle (profils, recettes, plannings, commandes avec relations), d'authentification, de stockage de fichiers et d'un tier gratuit suffisant pour prototyper.

## Décision

Supabase (Postgres géré, Auth, Storage, Edge Functions, RLS) plutôt que Firebase (NoSQL).

## Conséquences

- Le modèle de données de Coursia est fortement relationnel (profils ↔ plannings ↔ listes ↔ commandes) — Postgres est un meilleur fit que Firestore
- Row Level Security au niveau base de données plutôt que règles applicatives dupliquées
- Edge Functions (Deno) permettent de proxy les appels OpenAI sans exposer la clé API cliente
- Contrepartie : écosystème d'extensions un peu moins mature que Firebase sur mobile (compensé par le SDK JS officiel)
