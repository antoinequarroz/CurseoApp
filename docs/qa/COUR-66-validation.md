# COUR-66 — Rapport de validation

## Local

- historique distant récupéré avec `supabase migration fetch --linked` ;
- portée des neuf migrations auditée table par table ;
- `supabase db reset --local` : vert, toutes les migrations et le seed sont
  rejoués depuis une base vide ;
- `scripts/verify-migrations-partagees.sh` contrôle les accès client/serveur ;
- les scripts RLS existants restent la preuve avec de vrais comptes Auth.

## Production

- `supabase migration list --linked` : toutes les versions locales et
  distantes sont alignées jusqu'à `20260817163042` ;
- `supabase db push --linked --dry-run` a annoncé uniquement la correction du
  wrap, puis `supabase db push --linked --yes` l'a appliquée avec succès ;
- requête REST production du 19 août 2026 :
  `catalogue-v1-r-043`, « Wrap houmous, avocat et concombre », renvoie
  `https://images.pexels.com/photos/17321469/pexels-photo-17321469.jpeg` et la
  source Pexels attendue ;
- aucune Edge Function n'a été modifiée ou redéployée.

## Distribution mobile

Aucune build TestFlight : ce ticket ne modifie pas le bundle mobile.
