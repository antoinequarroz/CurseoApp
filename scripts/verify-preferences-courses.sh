#!/bin/bash
# COUR-79/80 : contraintes et isolation RLS des préférences de courses.
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
PASSWORD="verify-preferences-password"
USER_A=""
USER_B=""

nettoyer() {
  [ -n "$USER_A" ] && curl -sf -X DELETE "$API_URL/rest/v1/preferences_courses_en_ligne?profil_id=eq.$USER_A" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" >/dev/null || true
  [ -n "$USER_B" ] && curl -sf -X DELETE "$API_URL/rest/v1/preferences_courses_en_ligne?profil_id=eq.$USER_B" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" >/dev/null || true
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

USER_A=$(creer_utilisateur "verify-preferences-a@coursia.test")
USER_B=$(creer_utilisateur "verify-preferences-b@coursia.test")
TOKEN_A=$(obtenir_token "verify-preferences-a@coursia.test")
TOKEN_B=$(obtenir_token "verify-preferences-b@coursia.test")
curl -sf -X POST "$API_URL/rest/v1/profils" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -d "[{\"id\":\"$USER_A\",\"prenom\":\"Preferences A\"},{\"id\":\"$USER_B\",\"prenom\":\"Preferences B\"}]" >/dev/null

echo "--- A crée et lit ses préférences ---"
REPONSE=$(curl -sf -X POST "$API_URL/rest/v1/preferences_courses_en_ligne" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -H "Prefer: return=representation" -d "{\"profil_id\":\"$USER_A\",\"substitution_mode\":\"demander\",\"enseignes_autorisees\":[\"coop\"]}")
echo "$REPONSE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const r=JSON.parse(d);if(r[0]?.profil_id!=='$USER_A')process.exit(1)})"

echo "--- B ne voit ni ne modifie A ---"
[ "$(curl -sf "$API_URL/rest/v1/preferences_courses_en_ligne?profil_id=eq.$USER_A&select=profil_id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B")" = '[]' ] || { echo "ECHEC : B voit A"; exit 1; }
[ "$(curl -sf -X PATCH "$API_URL/rest/v1/preferences_courses_en_ligne?profil_id=eq.$USER_A" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"creneau_prefere":"soir"}')" = '[]' ] || { echo "ECHEC : B modifie A"; exit 1; }

echo "--- Les valeurs inconnues sont rejetées ---"
HTTP_INVALIDE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API_URL/rest/v1/preferences_courses_en_ligne?profil_id=eq.$USER_A" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d '{"enseignes_autorisees":["inconnue"]}')
[ "$HTTP_INVALIDE" = '400' ] || { echo "ECHEC : enseigne inconnue acceptée (HTTP $HTTP_INVALIDE)"; exit 1; }

echo "--- Anon ne peut pas lire la table privée ---"
HTTP_ANON=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/rest/v1/preferences_courses_en_ligne?select=profil_id" -H "apikey: $ANON_KEY")
[ "$HTTP_ANON" != '200' ] || { echo "ECHEC : anon lit les préférences"; exit 1; }

echo "Verification preferences courses : OK"
