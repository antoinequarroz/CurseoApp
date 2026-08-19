#!/bin/bash
# COUR-71 a COUR-76 : snapshot de checkout, idempotence et isolation RLS.
set -euo pipefail

if [ -n "${VERIFY_API_URL:-}" ] && [ -n "${VERIFY_ANON_KEY:-}" ] && [ -n "${VERIFY_SERVICE_KEY:-}" ]; then
  API_URL="$VERIFY_API_URL"
  ANON_KEY="$VERIFY_ANON_KEY"
  SERVICE_KEY="$VERIFY_SERVICE_KEY"
else
  STATUS=$(npx supabase status -o json)
  API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
  ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")
  SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")
fi
PASSWORD="verify-checkout-demo-password"
USER_A=""
USER_B=""

nettoyer() {
  [ -n "$USER_A" ] && curl -sf -X DELETE "$API_URL/rest/v1/commandes?profil_id=eq.$USER_A" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" >/dev/null || true
  [ -n "$USER_B" ] && curl -sf -X DELETE "$API_URL/rest/v1/commandes?profil_id=eq.$USER_B" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" >/dev/null || true
  [ -n "$USER_A" ] && curl -sf -X DELETE "$API_URL/rest/v1/profils?id=eq.$USER_A" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" >/dev/null || true
  [ -n "$USER_B" ] && curl -sf -X DELETE "$API_URL/rest/v1/profils?id=eq.$USER_B" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" >/dev/null || true
  [ -n "$USER_A" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$USER_A" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" >/dev/null || true
  [ -n "$USER_B" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$USER_B" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" >/dev/null || true
}
trap nettoyer EXIT

creer_utilisateur() {
  curl -sf -X POST "$API_URL/auth/v1/admin/users" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))"
}
obtenir_token() {
  curl -sf -X POST "$API_URL/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).access_token))"
}

USER_A=$(creer_utilisateur "verify-checkout-a@coursia.test")
USER_B=$(creer_utilisateur "verify-checkout-b@coursia.test")
TOKEN_A=$(obtenir_token "verify-checkout-a@coursia.test")
TOKEN_B=$(obtenir_token "verify-checkout-b@coursia.test")
curl -sf -X POST "$API_URL/rest/v1/profils" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -d "[{\"id\":\"$USER_A\",\"prenom\":\"Checkout A\"},{\"id\":\"$USER_B\",\"prenom\":\"Checkout B\"}]" >/dev/null

echo "--- Le compte A cree son snapshot de demonstration ---"
REPONSE=$(curl -sf -X POST "$API_URL/rest/v1/commandes" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -H "Prefer: return=representation" -d "{\"profil_id\":\"$USER_A\",\"paniers\":[{\"enseigne\":\"migros\",\"montant\":12.5,\"produits\":[]}],\"montant_total\":20.4,\"economies\":0,\"statut\":\"simulation_confirmee\",\"nature\":\"simulation\",\"strategie\":\"split_cart\",\"paiement_reference\":\"DEMO-VERIFY-A\",\"source_prix\":\"SwissGroceries\"}")
COMMANDE_ID=$(echo "$REPONSE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")
[ -n "$COMMANDE_ID" ] || { echo "ECHEC : commande demo non creee"; exit 1; }

echo "--- Le compte B ne voit ni ne modifie la commande A ---"
VUE_B=$(curl -sf "$API_URL/rest/v1/commandes?id=eq.$COMMANDE_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B")
[ "$VUE_B" = '[]' ] || { echo "ECHEC : B voit la commande A"; exit 1; }
MODIF_B=$(curl -sf -X PATCH "$API_URL/rest/v1/commandes?id=eq.$COMMANDE_ID" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"montant_total":1}')
[ "$MODIF_B" = '[]' ] || { echo "ECHEC : B modifie la commande A"; exit 1; }

echo "--- Un client ne peut pas creer une fausse commande marchande ---"
HTTP_MARCHAND=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/rest/v1/commandes" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d "{\"profil_id\":\"$USER_A\",\"nature\":\"marchand\",\"montant_total\":1}")
[ "$HTTP_MARCHAND" = '403' ] || { echo "ECHEC : nature marchand acceptee (HTTP $HTTP_MARCHAND)"; exit 1; }

echo "--- La reference rend le paiement de demo idempotent ---"
HTTP_DOUBLON=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/rest/v1/commandes" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d "{\"profil_id\":\"$USER_A\",\"nature\":\"simulation\",\"paiement_reference\":\"DEMO-VERIFY-A\"}")
[ "$HTTP_DOUBLON" = '409' ] || { echo "ECHEC : reference dupliquee acceptee (HTTP $HTTP_DOUBLON)"; exit 1; }

echo "--- Anon ne peut pas lire les snapshots ---"
HTTP_ANON=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/rest/v1/commandes?select=id" -H "apikey: $ANON_KEY")
[ "$HTTP_ANON" != '200' ] || { echo "ECHEC : anon lit commandes"; exit 1; }

echo "Verification checkout demo : OK"
