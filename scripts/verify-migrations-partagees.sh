#!/bin/bash
# COUR-66 : prouve que la reprise des migrations partagees conserve les
# acces mobiles utiles tout en fermant les tables reservees au serveur.
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")
FAILED=0

check_server_only() {
  local table="$1"
  local anon_code service_code
  anon_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/rest/v1/$table?select=*&limit=1" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY")
  service_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/rest/v1/$table?select=*&limit=1" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY")

  if [[ "$anon_code" != "401" && "$anon_code" != "403" ]]; then
    echo "ECHEC : $table reste lisible directement par anon (HTTP=$anon_code)"
    FAILED=1
  elif [[ "$service_code" != "200" ]]; then
    echo "ECHEC : $table est aussi bloquee pour service_role (HTTP=$service_code)"
    FAILED=1
  else
    echo "OK : $table fermee au client, disponible pour le serveur"
  fi
}

echo "--- Tables strictement serveur ---"
for table in rate_limits waitlist webhook_evenements_abonnement public_submission_rate_limits contact_submissions; do
  check_server_only "$table"
done

echo "--- Lecture publique des recettes publiees conservee ---"
RECETTES_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API_URL/rest/v1/recettes?select=id&statut_publication=eq.publiee&limit=1" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY")
if [[ "$RECETTES_CODE" != "200" ]]; then
  echo "ECHEC : le catalogue public est inaccessible (HTTP=$RECETTES_CODE)"
  FAILED=1
else
  echo "OK : catalogue public lisible"
fi

if [[ "$FAILED" -ne 0 ]]; then
  echo "Verification migrations partagees : ECHEC"
  exit 1
fi

echo "Verification migrations partagees : OK"
