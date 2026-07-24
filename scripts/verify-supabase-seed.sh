#!/bin/bash
# COUR-12 : verifie qu'une instance Supabase locale (deja demarree via
# `supabase start`/`db reset`) a bien toutes les tables attendues et le seed
# minimal de COUR-11. Sert de "test backend" en CI apres application des
# migrations — pas juste "la commande n'a pas plante", mais "le resultat est
# bien celui attendu".
#
# Usage : bash scripts/verify-supabase-seed.sh (depuis la racine du projet,
# avec la stack Supabase locale deja demarree)
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

FAILED=0

check_count() {
  local table="$1"
  local expected="$2"
  local actual
  actual=$(curl -sf "$API_URL/rest/v1/$table?select=id" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
  if [ "$actual" != "$expected" ]; then
    echo "ECHEC : $table attendu=$expected trouve=$actual"
    FAILED=1
  else
    echo "OK : $table ($actual ligne(s))"
  fi
}

check_table_exists() {
  local table="$1"
  # select=* (pas select=id) : certaines tables (favoris, swipes, rate_limits)
  # ont une cle primaire composite sans colonne `id`.
  if ! curl -sf "$API_URL/rest/v1/$table?select=*&limit=1" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null; then
    echo "ECHEC : table $table inaccessible (n'existe pas ou permission refusee)"
    FAILED=1
  else
    echo "OK : table $table accessible"
  fi
}

echo "--- Tables sans seed (juste presence) ---"
for t in commandes notifications favoris swipes signalements rate_limits waitlist unites_mesure; do
  check_table_exists "$t"
done

echo "--- Seed COUR-11/COUR-14/COUR-15/COUR-16 (nombre de lignes exact) ---"
check_count profils 1
check_count recettes 5
check_count planning_repas 1
check_count listes_courses 1
check_count ingredients 10
check_count recette_ingredients 10
check_count recette_etapes 10
check_count allergenes 14
check_count regimes 7
check_count enseignes 6
check_count produits_canoniques 1
check_count offres_magasin 3
check_count prix_historique 4

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification du schema/seed Supabase : ECHEC"
  exit 1
fi

echo ""
echo "Verification du schema/seed Supabase : OK"
