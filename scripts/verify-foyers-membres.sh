#!/bin/bash
# COUR-23 : reproduit la Verification litterale du ticket — creer deux
# foyers et demontrer l'isolation de leurs membres et donnees. Contrairement
# aux verify-*.sh precedents (anon vs service_role), ce script cree deux
# VRAIS comptes authentifies distincts (API Admin GoTrue) pour tester une
# isolation RLS keyed sur auth.uid(), pas seulement anon/service_role.
# Nettoyage par trap : supprimer les deux comptes de test entraine la
# cascade profils -> foyers -> membres_foyer.
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

EMAIL_A="verify-foyer-a@coursia.test"
EMAIL_B="verify-foyer-b@coursia.test"
PASSWORD="verify-foyer-password-test"
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

echo "--- Creation de deux comptes de test distincts ---"
USER_A_ID=$(creer_utilisateur "$EMAIL_A")
USER_B_ID=$(creer_utilisateur "$EMAIL_B")
TOKEN_A=$(connecter_utilisateur "$EMAIL_A")
TOKEN_B=$(connecter_utilisateur "$EMAIL_B")

echo "--- Profils + foyers (service_role, contourne RLS pour le setup) ---"
curl -sf -X POST "$API_URL/rest/v1/profils" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"$USER_A_ID\",\"prenom\":\"Foyer A\"}" > /dev/null
curl -sf -X POST "$API_URL/rest/v1/profils" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"$USER_B_ID\",\"prenom\":\"Foyer B\"}" > /dev/null

FOYER_A_ID=$(curl -sf -X POST "$API_URL/rest/v1/foyers" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"responsable_id\":\"$USER_A_ID\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")
FOYER_B_ID=$(curl -sf -X POST "$API_URL/rest/v1/foyers" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"responsable_id\":\"$USER_B_ID\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")

echo "--- Membres : le responsable + un enfant SANS compte de connexion par foyer ---"
curl -sf -X POST "$API_URL/rest/v1/membres_foyer" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"foyer_id\":\"$FOYER_A_ID\",\"profil_id\":\"$USER_A_ID\",\"prenom\":\"Parent A\",\"est_responsable\":true,\"regime\":[\"vegetarien\"]}" > /dev/null
curl -sf -X POST "$API_URL/rest/v1/membres_foyer" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"foyer_id\":\"$FOYER_A_ID\",\"prenom\":\"Enfant A\",\"age\":6,\"allergies\":[\"arachide\"]}" > /dev/null
curl -sf -X POST "$API_URL/rest/v1/membres_foyer" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"foyer_id\":\"$FOYER_B_ID\",\"profil_id\":\"$USER_B_ID\",\"prenom\":\"Parent B\",\"est_responsable\":true}" > /dev/null

echo "--- Utilisateur A : ne voit que son propre foyer ---"
FOYERS_VUS_PAR_A=$(curl -sf "$API_URL/rest/v1/foyers?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).map(f=>f.id).join(',')))")
if [ "$FOYERS_VUS_PAR_A" != "$FOYER_A_ID" ]; then
  echo "ECHEC : l'utilisateur A devrait voir uniquement son foyer ($FOYER_A_ID), obtenu=$FOYERS_VUS_PAR_A"
  FAILED=1
else
  echo "OK : l'utilisateur A ne voit que son propre foyer"
fi

echo "--- Utilisateur A : voit ses 2 membres, y compris celui sans compte de connexion ---"
MEMBRES_VUS_PAR_A=$(curl -sf "$API_URL/rest/v1/membres_foyer?select=prenom" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$MEMBRES_VUS_PAR_A" != "2" ]; then
  echo "ECHEC : l'utilisateur A devrait voir ses 2 membres (Parent A + Enfant A sans compte), obtenu=$MEMBRES_VUS_PAR_A"
  FAILED=1
else
  echo "OK : l'utilisateur A voit ses 2 membres, y compris celui sans compte de connexion"
fi

echo "--- Utilisateur A : lecture directe du foyer B renvoie vide (RLS, pas 403) ---"
FOYER_B_VU_PAR_A=$(curl -sf "$API_URL/rest/v1/foyers?id=eq.$FOYER_B_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$FOYER_B_VU_PAR_A" != "0" ]; then
  echo "ECHEC : l'utilisateur A a pu lire le foyer B (fuite entre foyers)"
  FAILED=1
else
  echo "OK : le foyer B est invisible pour l'utilisateur A"
fi

echo "--- Ecriture croisee : l'utilisateur A ne peut pas modifier un membre du foyer B ---"
curl -sf -X PATCH "$API_URL/rest/v1/membres_foyer?foyer_id=eq.$FOYER_B_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d '{"prenom":"Pirate"}' > /dev/null || true
PRENOM_B=$(curl -sf "$API_URL/rest/v1/membres_foyer?foyer_id=eq.$FOYER_B_ID&select=prenom" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].prenom))")
if [ "$PRENOM_B" = "Pirate" ]; then
  echo "ECHEC : l'utilisateur A a reussi a modifier un membre du foyer B"
  FAILED=1
else
  echo "OK : la tentative d'ecriture croisee n'a modifie aucune ligne (RLS a filtre la cible)"
fi

echo "--- Utilisateur B : symetrique, ne voit que son propre foyer ---"
FOYERS_VUS_PAR_B=$(curl -sf "$API_URL/rest/v1/foyers?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).map(f=>f.id).join(',')))")
if [ "$FOYERS_VUS_PAR_B" != "$FOYER_B_ID" ]; then
  echo "ECHEC : l'utilisateur B devrait voir uniquement son foyer ($FOYER_B_ID), obtenu=$FOYERS_VUS_PAR_B"
  FAILED=1
else
  echo "OK : l'utilisateur B ne voit que son propre foyer"
fi

echo "--- Anonyme : aucun acces a foyers/membres_foyer (RLS bloque, malgre le grant large) ---"
FOYERS_VUS_ANON=$(curl -sf "$API_URL/rest/v1/foyers?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$FOYERS_VUS_ANON" != "0" ]; then
  echo "ECHEC : un utilisateur anonyme a pu lire des foyers"
  FAILED=1
else
  echo "OK : aucun foyer visible pour un utilisateur anonyme"
fi

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification foyers/membres_foyer : ECHEC"
  exit 1
fi

echo ""
echo "Verification foyers/membres_foyer : OK"
