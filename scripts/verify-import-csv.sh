#!/bin/bash
# COUR-17 : reproduit la Verification litterale du ticket — importer un
# fichier valide deux fois (idempotence), puis un fichier avec plusieurs
# erreurs connues (aucun import partiel). Contre une instance Supabase
# locale deja demarree (seed charge).
set -euo pipefail

STATUS=$(npx supabase status -o json)
export SUPABASE_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
export SUPABASE_SERVICE_ROLE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

FAILED=0

count_recettes() {
  curl -sf "$SUPABASE_URL/rest/v1/recettes?select=id" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))"
}

AVANT=$(count_recettes)

echo "--- 1er import du fichier valide (doit creer 2 recettes) ---"
if node scripts/import-recettes-csv.mjs scripts/fixtures/recettes-valides.csv; then
  echo "OK : import reussi"
else
  echo "ECHEC : le premier import du fichier valide a echoue"
  FAILED=1
fi
APRES_1ER=$(count_recettes)
if [ "$APRES_1ER" != "$((AVANT + 2))" ]; then
  echo "ECHEC : attendu $((AVANT + 2)) recettes apres le 1er import, trouve $APRES_1ER"
  FAILED=1
else
  echo "OK : $APRES_1ER recettes (2 nouvelles)"
fi

echo "--- 2eme import du MEME fichier (doit etre idempotent, pas de doublon) ---"
if node scripts/import-recettes-csv.mjs scripts/fixtures/recettes-valides.csv; then
  echo "OK : import reussi"
else
  echo "ECHEC : le second import du fichier valide a echoue"
  FAILED=1
fi
APRES_2EME=$(count_recettes)
if [ "$APRES_2EME" != "$APRES_1ER" ]; then
  echo "ECHEC : le nombre de recettes a change entre le 1er et le 2eme import ($APRES_1ER -> $APRES_2EME), import non idempotent"
  FAILED=1
else
  echo "OK : toujours $APRES_2EME recettes, aucun doublon cree (idempotent)"
fi

echo "--- Import du fichier contenant plusieurs erreurs connues (doit tout rejeter) ---"
if node scripts/import-recettes-csv.mjs scripts/fixtures/recettes-avec-erreurs.csv; then
  echo "ECHEC : le fichier avec erreurs aurait du faire echouer le script"
  FAILED=1
else
  echo "OK : le script a bien signale un echec (code de sortie non nul)"
fi
APRES_ERREURS=$(count_recettes)
if [ "$APRES_ERREURS" != "$APRES_2EME" ]; then
  echo "ECHEC : des lignes ont ete importees depuis le fichier d'erreurs ($APRES_2EME -> $APRES_ERREURS), import partiel silencieux"
  FAILED=1
else
  echo "OK : aucune ligne importee depuis le fichier d'erreurs (import tout-ou-rien respecte)"
fi

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification pipeline import CSV : ECHEC"
  exit 1
fi

echo ""
echo "Verification pipeline import CSV : OK"
