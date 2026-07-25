#!/bin/bash
# COUR-26 : reproduit la Verification litterale du ticket — migrer des
# donnees existantes et charger plusieurs semaines sans collision. Teste
# aussi les autres criteres testables via l'API Data (contrainte anti-
# doublon, coherence ignore/recette, isolation RLS entre deux comptes reels,
# meme technique que COUR-23/24 : creation via l'API Admin GoTrue).
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

EMAIL_A="verify-repas-a@coursia.test"
EMAIL_B="verify-repas-b@coursia.test"
PASSWORD="verify-repas-password-test"
FAILED=0
USER_A_ID=""
USER_B_ID=""

nettoyer() {
  [ -n "$USER_A_ID" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$USER_A_ID" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
  [ -n "$USER_B_ID" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$USER_B_ID" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
}
trap nettoyer EXIT

creer_utilisateur() {
  curl -sf -X POST "$API_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))"
}

connecter_utilisateur() {
  curl -sf -X POST "$API_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).access_token))"
}

echo "--- Comptes de test ---"
USER_A_ID=$(creer_utilisateur "$EMAIL_A")
USER_B_ID=$(creer_utilisateur "$EMAIL_B")
TOKEN_A=$(connecter_utilisateur "$EMAIL_A")
TOKEN_B=$(connecter_utilisateur "$EMAIL_B")
curl -sf -X POST "$API_URL/rest/v1/profils" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"$USER_A_ID\",\"prenom\":\"Repas A\"}" > /dev/null
curl -sf -X POST "$API_URL/rest/v1/profils" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"$USER_B_ID\",\"prenom\":\"Repas B\"}" > /dev/null

RECETTE_ID=$(curl -sf "$API_URL/rest/v1/recettes?select=id&limit=1" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")

echo "--- Chargement de plusieurs semaines sans collision (dates distinctes, meme profil) ---"
for jour in 2026-08-03 2026-08-10 2026-08-17; do
  curl -sf -X POST "$API_URL/rest/v1/repas_planifies" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
    -d "{\"profil_id\":\"$USER_A_ID\",\"date_repas\":\"$jour\",\"moment\":\"midi\",\"recette_id\":\"$RECETTE_ID\",\"portions\":2}" > /dev/null
done
N_SEMAINES=$(curl -sf "$API_URL/rest/v1/repas_planifies?select=date_repas&order=date_repas.asc" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_SEMAINES" != "3" ]; then
  echo "ECHEC : 3 repas sur 3 semaines distinctes attendus, obtenu=$N_SEMAINES"
  FAILED=1
else
  echo "OK : 3 repas charges sur 3 semaines distinctes, sans collision"
fi

echo "--- Requete par intervalle (range) : ne renvoie que les dates dans la fenetre demandee ---"
N_INTERVALLE=$(curl -sf "$API_URL/rest/v1/repas_planifies?date_repas=gte.2026-08-05&date_repas=lte.2026-08-14&select=date_repas" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_INTERVALLE" != "1" ]; then
  echo "ECHEC : seul le 2026-08-10 devrait tomber dans l'intervalle [08-05, 08-14], obtenu=$N_INTERVALLE lignes"
  FAILED=1
else
  echo "OK : la requete par intervalle ne renvoie que la date attendue"
fi

echo "--- Doublon impossible : meme profil/date/moment rejete par la contrainte ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/rest/v1/repas_planifies" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d "{\"profil_id\":\"$USER_A_ID\",\"date_repas\":\"2026-08-03\",\"moment\":\"midi\",\"recette_id\":\"$RECETTE_ID\"}")
if [ "$HTTP_CODE" = "201" ]; then
  echo "ECHEC : un doublon (meme profil/date/moment) a ete accepte, devrait etre rejete"
  FAILED=1
else
  echo "OK : doublon rejete (HTTP $HTTP_CODE)"
fi

echo "--- Coherence ignore/recette : les deux a la fois rejetes ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/rest/v1/repas_planifies" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d "{\"profil_id\":\"$USER_A_ID\",\"date_repas\":\"2026-09-01\",\"moment\":\"midi\",\"ignore\":true,\"recette_id\":\"$RECETTE_ID\"}")
if [ "$HTTP_CODE" = "201" ]; then
  echo "ECHEC : ignore=true avec recette_id renseignee a ete accepte, devrait etre rejete"
  FAILED=1
else
  echo "OK : incoherence ignore+recette rejetee (HTTP $HTTP_CODE)"
fi

echo "--- Coherence ignore/recette : ni l'un ni l'autre rejete ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/rest/v1/repas_planifies" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d "{\"profil_id\":\"$USER_A_ID\",\"date_repas\":\"2026-09-02\",\"moment\":\"midi\",\"ignore\":false}")
if [ "$HTTP_CODE" = "201" ]; then
  echo "ECHEC : ignore=false sans recette_id a ete accepte, devrait etre rejete"
  FAILED=1
else
  echo "OK : incoherence absence des deux rejetee (HTTP $HTTP_CODE)"
fi

echo "--- Isolation RLS : l'utilisateur B ne voit aucun repas de l'utilisateur A ---"
N_VUS_PAR_B=$(curl -sf "$API_URL/rest/v1/repas_planifies?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_VUS_PAR_B" != "0" ]; then
  echo "ECHEC : l'utilisateur B voit des repas de l'utilisateur A (fuite RLS)"
  FAILED=1
else
  echo "OK : aucun repas de A visible par B"
fi

echo "--- Anonyme : aucun acces (RLS bloque, malgre le grant large) ---"
N_VUS_ANON=$(curl -sf "$API_URL/rest/v1/repas_planifies?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_VUS_ANON" != "0" ]; then
  echo "ECHEC : un utilisateur anonyme a pu lire des repas planifies"
  FAILED=1
else
  echo "OK : aucun repas visible pour un utilisateur anonyme"
fi

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification repas_planifies : ECHEC"
  exit 1
fi

echo ""
echo "Verification repas_planifies : OK"
