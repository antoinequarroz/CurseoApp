# ADR-005 : Proxy OpenAI via Supabase Edge Function

## Statut : Accepté

## Contexte

L'assistant IA (génération de planning, suggestions) nécessite d'appeler l'API OpenAI. Appeler OpenAI directement depuis le client mobile exposerait la clé API dans le bundle JavaScript, extractible en quelques minutes par rétro-ingénierie.

## Décision

Toutes les requêtes IA passent par `supabase/functions/ai-assistant`, qui vérifie l'authentification Supabase, le palier d'abonnement (Standard+), applique un rate limit (20 req/heure/utilisateur via la table `rate_limits`), valide l'input avec Zod, puis appelle OpenAI avec la clé stockée dans les secrets Supabase.

## Conséquences

- La clé `OPENAI_API_KEY` n'existe jamais côté client, uniquement dans les secrets Edge Functions
- Le rate limiting protège contre l'abus et les coûts incontrôlés
- Contrepartie : latence additionnelle du saut réseau côté Edge Function (négligeable comparé à la latence du modèle lui-même)
