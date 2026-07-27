#!/bin/bash
# COUR-34 : verifie l'authenticite, l'idempotence, la gestion de l'ordre
# d'arrivee et le traitement des evenements (achat/renouvellement/
# annulation/expiration/remboursement) du webhook RevenueCat, contre la
# stack Supabase locale (deja demarree via `supabase start`).
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

WEBHOOK_URL="$API_URL/functions/v1/revenuecat-webhook"
SECRET="secret-test-local-ci"
DEMO_ID="11111111-1111-1111-1111-111111111111"
FAILED=0

appeler_webhook() {
  # $1 = Authorization header value (vide = aucun header), $2 = corps JSON
  if [ -z "$1" ]; then
    curl -s -o /tmp/webhook_body.txt -w "%{http_code}" -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d "$2"
  else
    curl -s -o /tmp/webhook_body.txt -w "%{http_code}" -X POST "$WEBHOOK_URL" -H "Authorization: $1" -H "Content-Type: application/json" -d "$2"
  fi
}

abonnement_actuel() {
  curl -sf "$API_URL/rest/v1/profils?id=eq.$DEMO_ID&select=abonnement" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].abonnement))"
}

reinitialiser_abonnement() {
  curl -sf -X PATCH "$API_URL/rest/v1/profils?id=eq.$DEMO_ID" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
    -d '{"abonnement":"gratuit"}' > /dev/null
}

verifier() {
  local libelle="$1" attendu="$2" obtenu="$3"
  if [ "$attendu" = "$obtenu" ]; then
    echo "OK : $libelle"
  else
    echo "ECHEC : $libelle (attendu=$attendu obtenu=$obtenu)"
    FAILED=1
  fi
}

echo "--- Authenticite : aucun header Authorization ---"
CODE=$(appeler_webhook "" '{"event":{"id":"evt-noauth","app_user_id":"'"$DEMO_ID"'","type":"EXPIRATION","event_timestamp_ms":1}}')
verifier "requete sans secret rejetee" "401" "$CODE"

echo "--- Authenticite : mauvais secret ---"
CODE=$(appeler_webhook "Bearer mauvais-secret" '{"event":{"id":"evt-badauth","app_user_id":"'"$DEMO_ID"'","type":"EXPIRATION","event_timestamp_ms":1}}')
verifier "mauvais secret rejete" "401" "$CODE"

echo "--- Payload JSON invalide ---"
CODE=$(appeler_webhook "Bearer $SECRET" 'ceci nest pas du json')
verifier "JSON invalide rejete" "400" "$CODE"

echo "--- Champs obligatoires manquants (event_timestamp_ms absent) ---"
CODE=$(appeler_webhook "Bearer $SECRET" '{"event":{"id":"evt-noid","app_user_id":"'"$DEMO_ID"'","type":"EXPIRATION"}}')
verifier "event_timestamp_ms manquant rejete" "400" "$CODE"

echo "--- Achat initial (INITIAL_PURCHASE) ---"
CODE=$(appeler_webhook "Bearer $SECRET" '{"event":{"id":"evt-achat-1","app_user_id":"'"$DEMO_ID"'","type":"INITIAL_PURCHASE","event_timestamp_ms":1000,"entitlement_ids":["standard"]}}')
verifier "achat accepte" "200" "$CODE"
verifier "palier standard applique" "standard" "$(abonnement_actuel)"

echo "--- Achat sans entitlement actif (rejete, jamais devine) ---"
CODE=$(appeler_webhook "Bearer $SECRET" '{"event":{"id":"evt-achat-vide","app_user_id":"'"$DEMO_ID"'","type":"INITIAL_PURCHASE","event_timestamp_ms":1100,"entitlement_ids":[]}}')
verifier "achat sans entitlement rejete" "422" "$CODE"

echo "--- Palier inconnu rejete ---"
CODE=$(appeler_webhook "Bearer $SECRET" '{"event":{"id":"evt-palier-inconnu","app_user_id":"'"$DEMO_ID"'","type":"INITIAL_PURCHASE","event_timestamp_ms":1200,"entitlement_ids":["palier-qui-nexiste-pas"]}}')
verifier "palier inconnu rejete" "422" "$CODE"

echo "--- Idempotence : rejouer le meme evenement (meme id) ---"
CODE=$(appeler_webhook "Bearer $SECRET" '{"event":{"id":"evt-achat-1","app_user_id":"'"$DEMO_ID"'","type":"INITIAL_PURCHASE","event_timestamp_ms":1000,"entitlement_ids":["standard"]}}')
verifier "doublon accepte sans erreur" "200" "$CODE"
verifier "abonnement inchange apres doublon" "standard" "$(abonnement_actuel)"

echo "--- Renouvellement (RENEWAL) conserve le palier ---"
CODE=$(appeler_webhook "Bearer $SECRET" '{"event":{"id":"evt-renewal-1","app_user_id":"'"$DEMO_ID"'","type":"RENEWAL","event_timestamp_ms":2000,"entitlement_ids":["standard"]}}')
verifier "renouvellement accepte" "200" "$CODE"
verifier "palier conserve apres renouvellement" "standard" "$(abonnement_actuel)"

echo "--- Ordre d'arrivee different : evenement en retard (horodatage anterieur) ignore ---"
CODE=$(appeler_webhook "Bearer $SECRET" '{"event":{"id":"evt-expiration-en-retard","app_user_id":"'"$DEMO_ID"'","type":"EXPIRATION","event_timestamp_ms":1500}}')
verifier "evenement hors-ordre accepte (200, ignore)" "200" "$CODE"
verifier "abonnement inchange (evenement hors-ordre sans effet)" "standard" "$(abonnement_actuel)"

echo "--- Annulation ordinaire (CANCELLATION sans remboursement) : pas de downgrade immediat ---"
CODE=$(appeler_webhook "Bearer $SECRET" '{"event":{"id":"evt-cancel-1","app_user_id":"'"$DEMO_ID"'","type":"CANCELLATION","event_timestamp_ms":3000}}')
verifier "annulation acceptee" "200" "$CODE"
verifier "acces conserve apres annulation ordinaire" "standard" "$(abonnement_actuel)"

echo "--- Remboursement (CANCELLATION, cancel_reason=REFUND) : downgrade immediat ---"
CODE=$(appeler_webhook "Bearer $SECRET" '{"event":{"id":"evt-refund-1","app_user_id":"'"$DEMO_ID"'","type":"CANCELLATION","event_timestamp_ms":4000,"cancel_reason":"REFUND"}}')
verifier "remboursement accepte" "200" "$CODE"
verifier "acces retire immediatement apres remboursement" "gratuit" "$(abonnement_actuel)"

echo "--- Ré-achat puis expiration : downgrade ---"
appeler_webhook "Bearer $SECRET" '{"event":{"id":"evt-achat-2","app_user_id":"'"$DEMO_ID"'","type":"INITIAL_PURCHASE","event_timestamp_ms":5000,"entitlement_ids":["premium"]}}' > /dev/null
verifier "palier premium applique avant expiration" "premium" "$(abonnement_actuel)"
CODE=$(appeler_webhook "Bearer $SECRET" '{"event":{"id":"evt-expiration-1","app_user_id":"'"$DEMO_ID"'","type":"EXPIRATION","event_timestamp_ms":6000}}')
verifier "expiration acceptee" "200" "$CODE"
verifier "acces retire a l'expiration" "gratuit" "$(abonnement_actuel)"

echo "--- Idempotence sans effet de bord dupliqué (BILLING_ISSUE : une seule notification) ---"
appeler_webhook "Bearer $SECRET" '{"event":{"id":"evt-billing-1","app_user_id":"'"$DEMO_ID"'","type":"BILLING_ISSUE","event_timestamp_ms":7000}}' > /dev/null
appeler_webhook "Bearer $SECRET" '{"event":{"id":"evt-billing-1","app_user_id":"'"$DEMO_ID"'","type":"BILLING_ISSUE","event_timestamp_ms":7000}}' > /dev/null
NB_NOTIFS=$(curl -sf "$API_URL/rest/v1/notifications?profil_id=eq.$DEMO_ID&type=eq.billing_issue&select=id" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
verifier "une seule notification malgre le rejeu" "1" "$NB_NOTIFS"

echo "--- Journal d'evenements : minimal, sans donnees sensibles ---"
COLONNES=$(curl -sf "$API_URL/rest/v1/webhook_evenements_abonnement?id=eq.evt-achat-1&select=*" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(Object.keys(JSON.parse(d)[0]).sort().join(',')))")
verifier "colonnes du journal limitees a id/app_user_id/type/event_timestamp_ms/traite_le" "app_user_id,event_timestamp_ms,id,traite_le,type" "$COLONNES"

reinitialiser_abonnement

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification webhook RevenueCat : ECHEC"
  exit 1
fi

echo ""
echo "Verification webhook RevenueCat : OK"
