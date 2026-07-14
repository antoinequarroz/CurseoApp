# Schéma Supabase

Schéma SQL complet : `supabase/schema.sql`. Résumé des tables principales :

| Table | Rôle | RLS |
|---|---|---|
| `profils` | Profil foyer (préférences, abonnement, notifications) | `auth.uid() = id` |
| `recettes` | Recettes officielles + communautaires | Lecture publique, écriture par l'auteur |
| `planning_repas` | Planning hebdomadaire par profil | `auth.uid() = profil_id` |
| `listes_courses` | Liste de courses générée | `auth.uid() = profil_id` |
| `favoris` | Recettes favorites | `auth.uid() = profil_id` |
| `swipes` | Historique swipe (apprentissage préférences) | `auth.uid() = profil_id` |
| `commandes` | Historique des commandes validées | `auth.uid() = profil_id` |
| `signalements` | Modération recettes communautaires | Écriture/lecture de ses propres signalements |
| `rate_limits` | Rate limiting des Edge Functions | Accès service role uniquement |
| `waitlist` | Liste d'attente pré-lancement | Accès service role uniquement |

## Exemples de requêtes

```sql
-- Recettes compatibles avec un régime, paginées
select * from recettes
where regime && array['vegetarien']
order by created_at desc
limit 20 offset 0;

-- Dernières commandes d'un utilisateur
select * from commandes
where profil_id = auth.uid()
order by created_at desc
limit 5;
```

Règle absolue : jamais de `select` sans `limit` sur `recettes`, `commandes`, `swipes` (voir `hooks/useRecettes.ts` pour l'implémentation `useInfiniteQuery`).
