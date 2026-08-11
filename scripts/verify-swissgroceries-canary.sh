#!/bin/bash
# COUR-61 : prouve la garde canary contre la vraie API Auth locale. Le compte
# allowliste est le compte de seed deterministe ; un second compte Auth reel
# Standard, absent de la cohorte, doit rester ferme.
set -euo pipefail

if [ -n "${COUR61_API_URL:-}" ] && [ -n "${COUR61_ANON_KEY:-}" ] && [ -n "${COUR61_SERVICE_KEY:-}" ]; then
  API_URL="$COUR61_API_URL"
  ANON_KEY="$COUR61_ANON_KEY"
  SERVICE_KEY="$COUR61_SERVICE_KEY"
else
  STATUS=$(npx supabase status -o json)
  API_URL=$(printf '%s' "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
  ANON_KEY=$(printf '%s' "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")
  SERVICE_KEY=$(printf '%s' "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")
fi

FUNCTION_URL="$API_URL/functions/v1/swissgroceries"
DEMO_ID="11111111-1111-1111-1111-111111111111"
OTHER_ID=""
FAILED=0

cleanup() {
  curl -sf -X PATCH "$API_URL/rest/v1/profils?id=eq.$DEMO_ID" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" -H "Prefer: return=minimal" \
    -d '{"abonnement":"gratuit"}' > /dev/null || true
  [ -n "$OTHER_ID" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$OTHER_ID" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
}
trap cleanup EXIT

verify_response() {
  local label="$1" expected_code="$2" expected_message="$3" token="$4"
  local code
  code=$(curl -s -o /tmp/swissgroceries-canary-response.json -w "%{http_code}" \
    -X POST "$FUNCTION_URL" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d '{"action":"search","query":"riz basmati","chains":["migros"],"limit":2}')
  if [ "$code" = "$expected_code" ] && grep -q "$expected_message" /tmp/swissgroceries-canary-response.json; then
    echo "OK : $label"
  else
    echo "ECHEC : $label (HTTP=$code)"
    FAILED=1
  fi
}

verify_eligibility() {
  local label="$1" expected="$2" token="$3"
  local code
  code=$(curl -s -o /tmp/swissgroceries-eligibility-response.json -w "%{http_code}" \
    -X POST "$FUNCTION_URL" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d '{"action":"eligibility"}')
  if [ "$code" = "200" ] && grep -q "\"eligible\":$expected" /tmp/swissgroceries-eligibility-response.json; then
    echo "OK : $label"
  else
    echo "ECHEC : $label (HTTP=$code)"
    FAILED=1
  fi
}

DEMO_TOKEN=$(curl -sf -X POST "$API_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"demo@coursia.test","password":"demo-password-non-utilise"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).access_token))")

echo "--- Un utilisateur allowliste reste soumis au palier Standard+ ---"
verify_eligibility "compte Gratuit masque dans l app" "false" "$DEMO_TOKEN"
verify_response "compte Gratuit allowliste refuse" "403" "reservee aux abonnes Standard" "$DEMO_TOKEN"

curl -sf -X PATCH "$API_URL/rest/v1/profils?id=eq.$DEMO_ID" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"abonnement":"standard"}' > /dev/null

echo "--- Un utilisateur Standard allowliste franchit la garde canary ---"
verify_eligibility "compte Standard allowliste visible dans l app" "true" "$DEMO_TOKEN"
verify_response "compte Standard allowliste accepte par la garde" "503" "Comparateur live non configure" "$DEMO_TOKEN"

echo "--- Un utilisateur Standard hors cohorte reste ferme ---"
OTHER_EMAIL="verify-canary-$(date +%s)@coursia.test"
OTHER_PASSWORD="verify-canary-password-test"
OTHER_ID=$(curl -sf -X POST "$API_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$OTHER_EMAIL\",\"password\":\"$OTHER_PASSWORD\",\"email_confirm\":true}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))")
OTHER_TOKEN=$(curl -sf -X POST "$API_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$OTHER_EMAIL\",\"password\":\"$OTHER_PASSWORD\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).access_token))")
curl -sf -X POST "$API_URL/rest/v1/profils" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"$OTHER_ID\",\"prenom\":\"Canary Hors Cohorte\",\"abonnement\":\"standard\"}" > /dev/null
verify_eligibility "compte Standard hors cohorte masque dans l app" "false" "$OTHER_TOKEN"
verify_response "compte Standard hors cohorte refuse" "503" "Comparateur live desactive" "$OTHER_TOKEN"

if [ "$FAILED" -ne 0 ]; then
  echo "Verification cohorte SwissGroceries : ECHEC"
  exit 1
fi

echo "Verification cohorte SwissGroceries : OK"
