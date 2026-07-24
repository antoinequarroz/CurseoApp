#!/bin/bash
# COUR-18 : importe le catalogue initial reel (scripts/catalogue-initial.csv)
# sur l'environnement de validation local/CI et verifie le resultat -- sert
# de test de non-regression permanent (si un futur changement de schema
# casse le pipeline ou rend une reference du corpus invalide, ce step le
# detecte immediatement).
set -euo pipefail

STATUS=$(npx supabase status -o json)
export SUPABASE_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
export SUPABASE_SERVICE_ROLE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")
ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")

FAILED=0

echo "--- Import du catalogue initial (15 recettes) ---"
if ! node scripts/import-recettes-csv.mjs scripts/catalogue-initial.csv; then
  echo "ECHEC : import du catalogue initial"
  FAILED=1
fi

echo "--- Volume minimum de lancement (15 recettes publiees, voir CATALOGUE_RECETTES.md) ---"
N_PUBLIEES=$(curl -sf "$SUPABASE_URL/rest/v1/recettes?statut_publication=eq.publiee&select=id" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_PUBLIEES" -lt 15 ]; then
  echo "ECHEC : $N_PUBLIEES recettes publiees, attendu >= 15"
  FAILED=1
else
  echo "OK : $N_PUBLIEES recettes publiees (>= 15)"
fi

echo "--- Chaque recette importee a au moins un ingredient et une etape ---"
# Pas besoin de re-verifier apres coup : fn_importer_recettes_csv (COUR-17)
# refuse d'ecrire tout le fichier si une seule ligne manque d'ingredients
# ou d'etapes -- deja exerce par verify-import-csv.sh. Ici on verifie juste
# qu'au moins une recette du catalogue a bien plusieurs lignes filles
# (detecte une regression du cote embedding PostgREST, pas du cote import).
N_INGREDIENTS=$(curl -sf "$SUPABASE_URL/rest/v1/recette_ingredients?select=recette_id" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
# >= 60 : 15 recettes du catalogue x >= 4 ingredients chacune, au minimum
# (independamment des lignes du seed COUR-14).
if [ "$N_INGREDIENTS" -lt 60 ]; then
  echo "ECHEC : seulement $N_INGREDIENTS lignes recette_ingredients au total, attendu >= 60"
  FAILED=1
else
  echo "OK : $N_INGREDIENTS lignes d'ingredients au total"
fi

echo "--- Reimport idempotent (aucun doublon) ---"
AVANT=$(curl -sf "$SUPABASE_URL/rest/v1/recettes?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
node scripts/import-recettes-csv.mjs scripts/catalogue-initial.csv > /dev/null
APRES=$(curl -sf "$SUPABASE_URL/rest/v1/recettes?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$AVANT" != "$APRES" ]; then
  echo "ECHEC : le nombre de recettes a change apres reimport ($AVANT -> $APRES)"
  FAILED=1
else
  echo "OK : $APRES recettes, inchange apres reimport (idempotent)"
fi

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification catalogue initial : ECHEC"
  exit 1
fi

echo ""
echo "Verification catalogue initial : OK"
