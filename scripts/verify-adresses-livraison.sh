#!/bin/bash
# COUR-28 : verifie le CRUD + les contraintes de adresses_livraison avec un
# VRAI compte authentifie (API Admin GoTrue, meme technique que COUR-23/24/26).
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

EMAIL="verify-adresses@coursia.test"
PASSWORD="verify-adresses-password-test"
FAILED=0
USER_ID=""

nettoyer() {
  [ -n "$USER_ID" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$USER_ID" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
}
trap nettoyer EXIT

echo "--- Compte de test ---"
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
  -d "{\"id\":\"$USER_ID\",\"prenom\":\"Adresses Test\"}" > /dev/null

echo "--- Ajout d'une premiere adresse (par defaut) ---"
ADRESSE_1_ID=$(curl -sf -X POST "$API_URL/rest/v1/adresses_livraison" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"profil_id\":\"$USER_ID\",\"libelle\":\"Domicile\",\"rue\":\"Rue du Rhone 12\",\"npa\":\"1000\",\"ville\":\"Lausanne\",\"est_defaut\":true}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")
if [ -n "$ADRESSE_1_ID" ]; then
  echo "OK : premiere adresse ajoutee (id=$ADRESSE_1_ID)"
else
  echo "ECHEC : ajout de la premiere adresse refuse"
  FAILED=1
fi

echo "--- NPA invalide (3 chiffres) rejete par la contrainte ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/rest/v1/adresses_livraison" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"profil_id\":\"$USER_ID\",\"libelle\":\"Test\",\"rue\":\"Rue Test 1\",\"npa\":\"123\",\"ville\":\"Test\"}")
if [ "$HTTP_CODE" = "201" ]; then
  echo "ECHEC : un NPA invalide (123) a ete accepte"
  FAILED=1
else
  echo "OK : NPA invalide rejete (HTTP $HTTP_CODE)"
fi

echo "--- Deux adresses par defaut simultanees rejetees (contrainte unique partielle) ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/rest/v1/adresses_livraison" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"profil_id\":\"$USER_ID\",\"libelle\":\"Bureau\",\"rue\":\"Rue Centrale 5\",\"npa\":\"1003\",\"ville\":\"Lausanne\",\"est_defaut\":true}")
if [ "$HTTP_CODE" = "201" ]; then
  echo "ECHEC : une deuxieme adresse par defaut a ete acceptee en meme temps que la premiere"
  FAILED=1
else
  echo "OK : deuxieme adresse par defaut rejetee (HTTP $HTTP_CODE) — le repository retire d'abord le flag existant avant d'en poser un nouveau"
fi

echo "--- Ajout d'une deuxieme adresse (non par defaut) ---"
ADRESSE_2_ID=$(curl -sf -X POST "$API_URL/rest/v1/adresses_livraison" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"profil_id\":\"$USER_ID\",\"libelle\":\"Bureau\",\"rue\":\"Rue Centrale 5\",\"npa\":\"1003\",\"ville\":\"Lausanne\",\"est_defaut\":false}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")
N_ADRESSES=$(curl -sf "$API_URL/rest/v1/adresses_livraison?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_ADRESSES" != "2" ]; then
  echo "ECHEC : 2 adresses attendues, obtenu=$N_ADRESSES"
  FAILED=1
else
  echo "OK : les 2 adresses coexistent"
fi

echo "--- Modification d'une adresse ---"
curl -sf -X PATCH "$API_URL/rest/v1/adresses_livraison?id=eq.$ADRESSE_2_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"ville":"Renens"}' > /dev/null
VILLE_MODIFIEE=$(curl -sf "$API_URL/rest/v1/adresses_livraison?id=eq.$ADRESSE_2_ID&select=ville" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].ville))")
if [ "$VILLE_MODIFIEE" != "Renens" ]; then
  echo "ECHEC : la modification n'a pas ete prise en compte, obtenu=$VILLE_MODIFIEE"
  FAILED=1
else
  echo "OK : adresse modifiee (ville=Renens)"
fi

echo "--- Retrait d'une adresse ---"
curl -sf -X DELETE "$API_URL/rest/v1/adresses_livraison?id=eq.$ADRESSE_2_ID" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" > /dev/null
N_APRES_SUPPRESSION=$(curl -sf "$API_URL/rest/v1/adresses_livraison?id=eq.$ADRESSE_2_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_APRES_SUPPRESSION" != "0" ]; then
  echo "ECHEC : l'adresse existe toujours apres retrait"
  FAILED=1
else
  echo "OK : adresse retiree"
fi

echo "--- Anonyme : aucun acces (RLS bloque, malgre le grant large) ---"
N_VUS_ANON=$(curl -sf "$API_URL/rest/v1/adresses_livraison?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_VUS_ANON" != "0" ]; then
  echo "ECHEC : un utilisateur anonyme a pu lire des adresses"
  FAILED=1
else
  echo "OK : aucune adresse visible pour un utilisateur anonyme"
fi

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification adresses_livraison : ECHEC"
  exit 1
fi

echo ""
echo "Verification adresses_livraison : OK"
