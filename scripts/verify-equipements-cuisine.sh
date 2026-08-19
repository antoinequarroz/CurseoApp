#!/bin/bash
# COUR-70 : contraintes, RLS et balisage du catalogue avec deux vrais comptes.
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

PASSWORD="verify-equipements-password"
USER_A=""
USER_B=""

nettoyer() {
  [ -n "$USER_A" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$USER_A" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" >/dev/null || true
  [ -n "$USER_B" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$USER_B" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" >/dev/null || true
}
trap nettoyer EXIT

creer_utilisateur() {
  local email="$1"
  curl -sf -X POST "$API_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))"
}

obtenir_token() {
  local email="$1"
  curl -sf -X POST "$API_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\"}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).access_token))"
}

echo "--- Deux comptes Auth non privilegies ---"
USER_A=$(creer_utilisateur "verify-equipements-a@coursia.test")
USER_B=$(creer_utilisateur "verify-equipements-b@coursia.test")
TOKEN_A=$(obtenir_token "verify-equipements-a@coursia.test")

curl -sf -X POST "$API_URL/rest/v1/profils" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" \
  -d "[{\"id\":\"$USER_A\",\"prenom\":\"Cuisine A\"},{\"id\":\"$USER_B\",\"prenom\":\"Cuisine B\"}]" >/dev/null

echo "--- A peut modifier ses equipements ---"
REPONSE=$(curl -sf -X PATCH "$API_URL/rest/v1/profils?id=eq.$USER_A" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -H "Prefer: return=representation" -d '{"equipements_cuisine":["four","mixeur"]}')
VALEUR=$(echo "$REPONSE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d)[0].equipements_cuisine)))")
[ "$VALEUR" = '["four","mixeur"]' ] || { echo "ECHEC : mise a jour propre refusee"; exit 1; }

echo "--- NULL et tableau vide restent deux etats distincts ---"
curl -sf -X PATCH "$API_URL/rest/v1/profils?id=eq.$USER_A" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d '{"equipements_cuisine":null}' >/dev/null
NULL_ETAT=$(curl -sf "$API_URL/rest/v1/profils?id=eq.$USER_A&select=equipements_cuisine" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].equipements_cuisine === null))")
[ "$NULL_ETAT" = 'true' ] || { echo "ECHEC : NULL non conserve"; exit 1; }
curl -sf -X PATCH "$API_URL/rest/v1/profils?id=eq.$USER_A" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d '{"equipements_cuisine":[]}' >/dev/null
VIDE_ETAT=$(curl -sf "$API_URL/rest/v1/profils?id=eq.$USER_A&select=equipements_cuisine" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].equipements_cuisine.length))")
[ "$VIDE_ETAT" = '0' ] || { echo "ECHEC : tableau vide non conserve"; exit 1; }

echo "--- Un code inconnu est rejete par la contrainte ---"
HTTP_INVALIDE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API_URL/rest/v1/profils?id=eq.$USER_A" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d '{"equipements_cuisine":["teleporteur"]}')
[ "$HTTP_INVALIDE" = '400' ] || { echo "ECHEC : code inconnu accepte (HTTP $HTTP_INVALIDE)"; exit 1; }

echo "--- A ne peut ni voir ni modifier le profil B ---"
REPONSE_AUTRE=$(curl -sf -X PATCH "$API_URL/rest/v1/profils?id=eq.$USER_B" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -H "Prefer: return=representation" -d '{"equipements_cuisine":["four"]}')
[ "$REPONSE_AUTRE" = '[]' ] || { echo "ECHEC : A a modifie B"; exit 1; }
NB_VUE=$(curl -sf "$API_URL/rest/v1/profils_actifs?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
[ "$NB_VUE" = '1' ] || { echo "ECHEC : profils_actifs expose un autre profil ($NB_VUE lignes)"; exit 1; }

echo "--- Le catalogue audite conserve ses besoins apres import ---"
TAGS=$(curl -sf "$API_URL/rest/v1/recettes?cle_externe=eq.catalogue-r-004&select=equipements_requis" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d)[0]?.equipements_requis)))")
[ "$TAGS" = '["plaques_cuisson","four"]' ] || { echo "ECHEC : tags catalogue-r-004 inattendus: $TAGS"; exit 1; }
SANS_EQUIPEMENT=$(curl -sf "$API_URL/rest/v1/recettes?cle_externe=eq.catalogue-v1-r-043&select=equipements_requis" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0]?.equipements_requis.length))")
[ "$SANS_EQUIPEMENT" = '0' ] || { echo "ECHEC : recette sans besoin mal classee"; exit 1; }

echo "Verification equipements cuisine : OK"
