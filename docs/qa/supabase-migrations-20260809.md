# Etat des migrations Supabase - 9 aout 2026

## Verification en lecture seule

- `20260809123024_add_profils_enfants_ages` est presente dans l'historique
  local et distant.
- Une requete REST anonyme `profils?select=enfants_ages&limit=0` retourne HTTP
  200 : la colonne est exposee et reconnue par le cache de schema de
  production.
- `supabase db push --linked --dry-run` refuse de continuer car neuf versions
  distantes du 28 juillet 2026 n'ont aucun fichier local :
  `20260728135749`, `20260728135926`, `20260728140600`, `20260728140818`,
  `20260728141004`, `20260728141113`, `20260728141653`, `20260728194936`,
  `20260728200405`.

## Consequence

Le correctif d'onboarding est actif en production, mais le prochain
deploiement de migration restera bloque tant que l'historique n'aura pas ete
reconcilie.

## Action sensible restante

Comparer le schema distant au depot, sauvegarder l'etat, puis choisir entre un
`db pull` et un `migration repair`. Ne pas executer automatiquement la
suggestion de repair du CLI : elle modifie l'historique de production sans
recreer les fichiers SQL manquants.
