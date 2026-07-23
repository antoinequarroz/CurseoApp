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

### ⚠️ Limite de cet environnement de développement

Docker Desktop est installé sur cette machine mais **le service ne démarre
pas sans droits administrateur**, que je n'ai pas dans cet environnement.
Je n'ai donc pas pu exécuter `supabase start`/`db reset` moi-même, ni
vérifier la reconstruction "deux fois de suite" demandée par le critère de
vérification du ticket.

**Ce qui est fait et vérifié** : les migrations elles-mêmes ont déjà été
testées avec succès contre un schéma Postgres vierge lors de COUR-9 (via
transaction annulée sur le projet distant) — la logique de création est
donc éprouvée. Ce qui manque, c'est l'exécution réelle de `supabase start`
sur une machine où Docker tourne.

**Action demandée** : lancer `npx supabase start` (ou `db reset` si déjà
démarré) **deux fois de suite** sur ta machine (ou en CI), confirmer que
l'app se lance dessus, puis me dire si ça correspond au résultat attendu.

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
