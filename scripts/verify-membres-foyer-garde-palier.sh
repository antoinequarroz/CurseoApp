#!/bin/bash
# COUR-35 : "aucun etat local ne permet de contourner un droit" — verifie
# que la garde Famille sur l'ajout de membres du foyer existe reellement
# cote serveur (trigger trg_verifier_ajout_membre_foyer), pas seulement
# dans l'ecran app/membres-foyer.tsx. Un utilisateur authentifie qui
# appellerait directement l'API REST Supabase (en contournant le client)
# doit etre bloque exactement comme s'il utilisait l'app.
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

EMAIL="verify-garde-palier@coursia.test"
PASSWORD="verify-garde-palier-password-test"
FAILED=0
USER_ID=""

nettoyer() {
  [ -n "$USER_ID" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$USER_ID" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
}
trap nettoyer EXIT

echo "--- Compte de test, palier gratuit au depart ---"
USER_ID=$(curl -sf -X POST "$API_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))")
TOKEN=$(curl -sf -X POST "$API_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).access_token))")
curl -sf -X POST "$API_URL/rest/v1/profils" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"$USER_ID\",\"prenom\":\"Garde Palier Test\",\"abonnement\":\"gratuit\"}" > /dev/null

echo "--- Le compte cree son propre foyer (autorise a tous les paliers, RLS = propriete) ---"
FOYER_ID=$(curl -sf -X POST "$API_URL/rest/v1/foyers" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"responsable_id\":\"$USER_ID\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")
if [ -n "$FOYER_ID" ]; then echo "OK : foyer cree"; else echo "ECHEC : creation du foyer refusee"; FAILED=1; fi

echo "--- Tentative d'ajout direct d'un membre SANS palier Famille (doit etre rejetee cote serveur) ---"
HTTP_CODE=$(curl -s -o /tmp/reponse_membre.json -w "%{http_code}" -X POST "$API_URL/rest/v1/membres_foyer" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"foyer_id\":\"$FOYER_ID\",\"prenom\":\"Contournement\"}")
if [ "$HTTP_CODE" = "400" ] && grep -q "palier Famille" /tmp/reponse_membre.json; then
  echo "OK : ajout rejete cote serveur sans palier Famille (contournement client impossible)"
else
  echo "ECHEC : ajout accepte ou message inattendu (HTTP=$HTTP_CODE, corps=$(cat /tmp/reponse_membre.json))"
  FAILED=1
fi

echo "--- Passage au palier Famille ---"
curl -sf -X PATCH "$API_URL/rest/v1/profils?id=eq.$USER_ID" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"abonnement":"famille"}' > /dev/null

echo "--- Ajout de 6 membres (limite reelle, doit tous reussir) ---"
MEMBRE_ID=""
for i in 1 2 3 4 5 6; do
  REPONSE=$(curl -s -X POST "$API_URL/rest/v1/membres_foyer" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Prefer: return=representation" \
    -d "{\"foyer_id\":\"$FOYER_ID\",\"prenom\":\"Membre $i\"}")
  MEMBRE_ID=$(echo "$REPONSE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d)[0].id)}catch{console.log('')}})")
  if [ -z "$MEMBRE_ID" ]; then
    echo "ECHEC : ajout du membre $i refuse alors que le palier est Famille ($REPONSE)"
    FAILED=1
  fi
done
if [ -n "$MEMBRE_ID" ]; then echo "OK : 6 membres ajoutes avec le palier Famille"; fi

echo "--- 7e membre (doit etre rejete, limite de 6 atteinte) ---"
HTTP_CODE=$(curl -s -o /tmp/reponse_limite.json -w "%{http_code}" -X POST "$API_URL/rest/v1/membres_foyer" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"foyer_id\":\"$FOYER_ID\",\"prenom\":\"Membre 7\"}")
if [ "$HTTP_CODE" = "400" ] && grep -q "limite de 6" /tmp/reponse_limite.json; then
  echo "OK : 7e membre rejete cote serveur"
else
  echo "ECHEC : 7e membre accepte ou message inattendu (HTTP=$HTTP_CODE, corps=$(cat /tmp/reponse_limite.json))"
  FAILED=1
fi

echo "--- Retrograde a gratuit : le retrait d'un membre existant reste possible (ne degrade pas l'experience) ---"
curl -sf -X PATCH "$API_URL/rest/v1/profils?id=eq.$USER_ID" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"abonnement":"gratuit"}' > /dev/null
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API_URL/rest/v1/membres_foyer?id=eq.$MEMBRE_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" = "204" ]; then
  echo "OK : retrait d'un membre existant toujours possible apres retrogradation"
else
  echo "ECHEC : retrait bloque apres retrogradation (HTTP=$HTTP_CODE)"
  FAILED=1
fi

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification garde palier membres du foyer : ECHEC"
  exit 1
fi

echo ""
echo "Verification garde palier membres du foyer : OK"
