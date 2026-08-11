#!/bin/bash
# COUR-18 / COUR-47 : importe le catalogue V1 reel (50 recettes)
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

echo "--- L'import operateur est inaccessible a la cle anonyme ---"
ANON_IMPORT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/rpc/fn_importer_recettes_csv" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"lignes":[],"dry_run":true}')
if [[ "$ANON_IMPORT_STATUS" != "401" && "$ANON_IMPORT_STATUS" != "403" && "$ANON_IMPORT_STATUS" != "404" ]]; then
  echo "ECHEC : appel anonyme retourne HTTP $ANON_IMPORT_STATUS, attendu 401/403/404"
  FAILED=1
else
  echo "OK : appel anonyme refuse (HTTP $ANON_IMPORT_STATUS)"
fi

CATALOGUE_FILES=(
  "scripts/catalogue-initial.csv"
  "scripts/catalogue-v1-extension.csv"
)

import_catalogue() {
  for catalogue_file in "${CATALOGUE_FILES[@]}"; do
    node scripts/import-recettes-csv.mjs "$catalogue_file"
  done
}

echo "--- Import du catalogue V1 (15 recettes initiales + 35 nouvelles) ---"
if ! import_catalogue; then
  echo "ECHEC : import du catalogue V1"
  FAILED=1
fi

echo "--- Volume minimum du prototype (50 recettes publiees, voir CATALOGUE_RECETTES.md) ---"
N_PUBLIEES=$(curl -sf "$SUPABASE_URL/rest/v1/recettes?statut_publication=eq.publiee&select=id" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_PUBLIEES" -lt 50 ]; then
  echo "ECHEC : $N_PUBLIEES recettes publiees, attendu >= 50"
  FAILED=1
else
  echo "OK : $N_PUBLIEES recettes publiees (>= 50)"
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
# >= 200 : 50 recettes du catalogue x >= 4 ingredients chacune, au minimum
# (independamment des lignes du seed COUR-14).
if [ "$N_INGREDIENTS" -lt 200 ]; then
  echo "ECHEC : seulement $N_INGREDIENTS lignes recette_ingredients au total, attendu >= 200"
  FAILED=1
else
  echo "OK : $N_INGREDIENTS lignes d'ingredients au total"
fi

echo "--- Completude editoriale des 50 recettes du catalogue ---"
RECETTES_DETAIL=$(curl -sf "$SUPABASE_URL/rest/v1/recettes?cle_externe=like.catalogue*&select=cle_externe,recette_ingredients(id),recette_etapes(id)" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY")
RECETTES_INCOMPLETES=$(echo "$RECETTES_DETAIL" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const r=JSON.parse(d);console.log(r.filter(x=>x.recette_ingredients.length<4||x.recette_etapes.length<3).map(x=>x.cle_externe).join(','))})")
N_RECETTES_CATALOGUE=$(echo "$RECETTES_DETAIL" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_RECETTES_CATALOGUE" -ne 50 ] || [ -n "$RECETTES_INCOMPLETES" ]; then
  echo "ECHEC : $N_RECETTES_CATALOGUE recettes catalogue trouvees; incompletes: ${RECETTES_INCOMPLETES:-aucune}"
  FAILED=1
else
  echo "OK : 50 recettes avec au moins 4 ingredients et 3 etapes"
fi

echo "--- Reimport idempotent (aucun doublon) ---"
AVANT=$(curl -sf "$SUPABASE_URL/rest/v1/recettes?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
import_catalogue > /dev/null
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
  echo "Verification catalogue V1 : ECHEC"
  exit 1
fi

echo ""
echo "Verification catalogue V1 : OK"
