#!/usr/bin/env bash

set -euo pipefail

BACKUP_DIR="${1:-backup}"
RESTORE_DB_URL="${RESTORE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

for file in roles.sql schema.sql data.sql SHA256SUMS; do
  test -s "$BACKUP_DIR/$file" || {
    echo "Archive incomplete : $file est absent ou vide." >&2
    exit 1
  }
done

(
  cd "$BACKUP_DIR"
  sha256sum -c SHA256SUMS
)

if [[ -n "$(psql "$RESTORE_DB_URL" --tuples-only --no-align --command \
  "select to_regclass('public.recettes')")" ]]; then
  echo "La cible n'est pas vierge : public.recettes existe deja." >&2
  exit 1
fi

# La transaction unique garantit qu'une archive partiellement restaurable ne
# laisse jamais une cible presentee comme saine. Les privileges par defaut sont
# revoques avant le schema, conformement au guide officiel Supabase.
psql "$RESTORE_DB_URL" \
  --quiet \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --command 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated' \
  --file "$BACKUP_DIR/roles.sql" \
  --file "$BACKUP_DIR/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$BACKUP_DIR/data.sql"

public_tables="$(psql "$RESTORE_DB_URL" --tuples-only --no-align --command \
  "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'")"
tables_without_rls="$(psql "$RESTORE_DB_URL" --tuples-only --no-align --command \
  "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity")"
recipes="$(psql "$RESTORE_DB_URL" --tuples-only --no-align --command 'select count(*) from public.recettes')"
profiles="$(psql "$RESTORE_DB_URL" --tuples-only --no-align --command 'select count(*) from public.profils')"
auth_users="$(psql "$RESTORE_DB_URL" --tuples-only --no-align --command 'select count(*) from auth.users')"

[[ "$public_tables" -ge 48 ]] || {
  echo "Schema incomplet : seulement $public_tables tables publiques." >&2
  exit 1
}
[[ "$tables_without_rls" -eq 0 ]] || {
  echo "Securite incomplete : $tables_without_rls tables publiques sans RLS." >&2
  exit 1
}
[[ "$recipes" -ge 50 ]] || {
  echo "Catalogue incomplet : seulement $recipes recettes." >&2
  exit 1
}
[[ "$profiles" -ge 1 && "$auth_users" -ge 1 ]] || {
  echo "Donnees utilisateur absentes apres restauration." >&2
  exit 1
}

echo "Restauration validee : $public_tables tables RLS, $recipes recettes, $profiles profils et $auth_users comptes Auth."
