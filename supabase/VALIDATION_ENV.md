# Environnement de validation reproductible (COUR-10)

Deux options existent pour tester les migrations sans toucher à la production.
**Seule l'option A est utilisable aujourd'hui** — voir §3 pour pourquoi.

## Option A — Stack Supabase locale (Docker), recommandée

### Créer l'environnement

```bash
npx supabase start
```

Cette commande unique :
- démarre Postgres + Auth + Storage + Edge Functions en conteneurs Docker,
- **applique automatiquement toutes les migrations** de `supabase/migrations/`
  dans l'ordre chronologique,
- **charge `supabase/seed.sql`** (profil + 5 recettes fictives, aucune donnée
  réelle) pour pouvoir lancer l'app immédiatement.

À la fin, la commande affiche les URLs et clés locales (`API URL`,
`anon key`, `service_role key`, Studio sur `http://localhost:54323`). Pour
lancer l'app dessus : copier ces valeurs dans `.env.development` à la place
de celles de production, le temps du test.

### Remettre à zéro

```bash
npx supabase db reset
```

Recrée la base locale de zéro : rejoue toutes les migrations puis le seed.
C'est la commande à lancer pour "recréer l'environnement depuis zéro" — pas
besoin de `stop`/`start` à chaque fois.

### Arrêter complètement

```bash
npx supabase stop
```

Arrête et supprime les conteneurs (ajouter `--no-backup` pour ne garder
aucune donnée locale entre deux sessions).

### ✅ Vérifié en conditions réelles (2026-07-23)

Docker Desktop ne peut pas être piloté depuis cet environnement automatisé
(le service refuse de démarrer sans droits administrateur) — l'exécution
réelle de `supabase start`/`db reset` a donc été faite manuellement sur la
machine de développement. Ça a révélé 2 vrais bugs que la vérification par
transaction annulée seule n'avait pas attrapés :

1. **Ordre chronologique des migrations** — `20260715080000` (historique)
   activait RLS sur `waitlist`/`rate_limits` avant que ces tables ne soient
   créées par la migration de recréation. Corrigé en renommant cette
   dernière en `20260714000000` (avant l'historique).
2. **Grant `service_role` manquant** — absent des migrations (COUR-9 ne
   vérifiait que `anon`/`authenticated`), invisible sur le projet distant
   déjà provisionné mais bloquant sur un environnement neuf (les Edge
   Functions utilisent `service_role`). Ajouté.

Après ces deux corrections, `supabase db reset` a été relancé deux fois de
suite avec succès (même résultat à chaque fois : 11 tables + seed).
**Critère de vérification du ticket rempli.**

## Option B — Branche Supabase cloud (pas de Docker requis)

Supabase propose des "branches" (base isolée à la demande, migrations
appliquées automatiquement, pas besoin de Docker). **Non disponible sur ce
projet** : ça nécessite le plan Pro ou supérieur (le projet actuel est sur
un plan qui ne l'inclut pas — message reçu : `Branching is supported only
on the Pro plan or above`). Si le plan est amené à changer, la commande est :

```bash
npx supabase branches create validation --project-ref bpycfeyapuekmesmxnvd
```

## Fichiers concernés

- `supabase/config.toml` — config générée par `supabase init`, ports/services
  par défaut.
- `supabase/seed.sql` — données non sensibles (1 profil démo, 5 recettes).
- `supabase/migrations/` — voir `MIGRATIONS.md` (COUR-9).
