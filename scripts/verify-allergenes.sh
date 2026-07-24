#!/bin/bash
# COUR-15 : matrice de test ingredients/synonymes/allergenes/regimes contre
# une instance Supabase locale (deja demarree via `supabase start`/`db
# reset`, seed COUR-15 charge). Utilise PostgREST (REST + RPC) plutot que
# `docker exec psql` pour rester portable en CI (pas d'hypothese sur le nom
# du conteneur Docker).
#
# Usage : bash scripts/verify-allergenes.sh (depuis la racine du projet,
# avec la stack Supabase locale deja demarree)
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

FAILED=0

# --- 1. Resolution de synonymes (RPC fn_resoudre_allergene) ---
#
# `terme_json` est deja echappe JSON (ex. è pour "è") plutot qu'un
# caractere accentue litteral dans ce script : le shell Windows/git-bash de
# cet environnement transcode silencieusement les octets UTF-8 multi-bytes
# lors du passage de la commande (verifie : Content-Length observe plus
# court que la taille reelle de la chaine UTF-8), ce qui casse le JSON cote
# PostgREST. Les echappements \uXXXX sont de l'ASCII pur : aucun risque de
# transcodage, et JSON les decode normalement cote serveur.
check_synonyme() {
  local terme_json="$1"
  local code_attendu="$2"
  local code_obtenu
  code_obtenu=$(curl -sf -X POST "$API_URL/rest/v1/rpc/fn_resoudre_allergene" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" \
    -d "{\"terme\":\"$terme_json\"}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.length?j[0].code:'AUCUN')})")
  if [ "$code_obtenu" != "$code_attendu" ]; then
    echo "ECHEC : synonyme '$terme_json' -> attendu=$code_attendu obtenu=$code_obtenu"
    FAILED=1
  else
    echo "OK : synonyme '$terme_json' -> $code_obtenu"
  fi
}

echo "--- Synonymes (accents/casse/variantes courantes) ---"
check_synonyme "cacahu\u00e8te" "arachide"
check_synonyme "CACAHOUETE" "arachide"
check_synonyme "Fruits A Coque" "fruits_a_coque"
check_synonyme "lait" "lactose"
check_synonyme "gluten" "gluten"
check_synonyme "terme_inconnu_xyz" "AUCUN"

# --- 2. Allergenes effectifs par recette (declares + deduits, source/certitude) ---
check_allergene_effectif() {
  local recette_id="$1"
  local code="$2"
  local source="$3"
  local certitude="$4"
  local libelle="$5"
  local n
  n=$(curl -sf "$API_URL/rest/v1/recette_allergenes_effectifs?recette_id=eq.$recette_id&code=eq.$code&source=eq.$source&certitude=eq.$certitude&select=code" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
  if [ "$n" -lt 1 ]; then
    echo "ECHEC : $libelle absent (recette=$recette_id code=$code source=$source certitude=$certitude)"
    FAILED=1
  else
    echo "OK : $libelle"
  fi
}

echo "--- Allergenes effectifs (matrice declare/deduit x confirme/possible) ---"
check_allergene_effectif "22222222-2222-2222-2222-222222222201" "lactose" "declare" "confirme" "Rösti : lactose declare"
check_allergene_effectif "22222222-2222-2222-2222-222222222201" "lactose" "deduit" "confirme" "Rösti : lactose deduit du Gruyère râpé"
check_allergene_effectif "22222222-2222-2222-2222-222222222204" "poisson" "declare" "confirme" "Saumon : poisson declare"
# Cas cle du ticket : une recette sans allergene EXPLICITEMENT declare (203,
# Buddha bowl) doit quand meme faire remonter un allergene AMBIGU deduit de
# ses ingredients (Quinoa -> gluten, risque de contamination croisee) — la
# regle ambigue doit etre SIGNALEE, jamais silencieusement traitee comme sure.
check_allergene_effectif "22222222-2222-2222-2222-222222222203" "gluten" "deduit" "possible" "Buddha bowl : gluten POSSIBLE (Quinoa, ambigu — ne doit jamais disparaitre)"

echo "--- Recette sans aucun allergene effectif attendu (205, reference 'rien a signaler') ---"
N205=$(curl -sf "$API_URL/rest/v1/recette_allergenes_effectifs?recette_id=eq.22222222-2222-2222-2222-222222222205&select=code" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N205" != "0" ]; then
  echo "ECHEC : Curry de lentilles (205) devrait n'avoir aucun allergene effectif, trouve $N205"
  FAILED=1
else
  echo "OK : Curry de lentilles (205) — aucun allergene effectif"
fi

# --- 3. Regimes attendus par recette ---
check_regime() {
  local recette_id="$1"
  local code="$2"
  local libelle="$3"
  local n
  n=$(curl -sf "$API_URL/rest/v1/recette_regimes?recette_id=eq.$recette_id&select=regime_id,regimes(code)" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.filter(r=>r.regimes && r.regimes.code==='$code').length)})")
  if [ "$n" -lt 1 ]; then
    echo "ECHEC : $libelle absent"
    FAILED=1
  else
    echo "OK : $libelle"
  fi
}

echo "--- Regimes (matrice) ---"
check_regime "22222222-2222-2222-2222-222222222203" "vegan" "Buddha bowl : vegan"
check_regime "22222222-2222-2222-2222-222222222203" "sans_gluten" "Buddha bowl : sans_gluten"
check_regime "22222222-2222-2222-2222-222222222204" "poisson" "Saumon : regime poisson"
check_regime "22222222-2222-2222-2222-222222222204" "sans_lactose" "Saumon : sans_lactose"

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification allergenes/regimes/synonymes : ECHEC"
  exit 1
fi

echo ""
echo "Verification allergenes/regimes/synonymes : OK"
