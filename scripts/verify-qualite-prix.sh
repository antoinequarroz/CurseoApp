#!/bin/bash
# COUR-21 : reproduit la Verification litterale du ticket — injecter des
# prix perimes et anormaux, puis verifier leur signalement. Insere des
# lignes de test avec des ids fixes, verifie, puis les supprime (idempotent,
# ne pollue pas les autres scripts de verification qui tournent dans la
# meme CI).
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

OFFRE_MIGROS_1KG="88888888-8888-8888-8888-888888888801"
OFFRE_TEST_PERIME="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1"
FAILED=0

nettoyer() {
  curl -sf -X DELETE "$API_URL/rest/v1/prix_historique?id=eq.aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
  curl -sf -X DELETE "$API_URL/rest/v1/prix_historique?id=eq.aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
  curl -sf -X DELETE "$API_URL/rest/v1/prix_historique?offre_id=eq.$OFFRE_TEST_PERIME" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
  curl -sf -X DELETE "$API_URL/rest/v1/offres_magasin?id=eq.$OFFRE_TEST_PERIME" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
}
trap nettoyer EXIT

echo "--- Offre de test dediee (aucun prix existant) + un seul prix perime dessus (source scraping, 60 jours) ---"
PRODUIT_ID=$(curl -sf "$API_URL/rest/v1/produits_canoniques?select=id&limit=1" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")
ENSEIGNE_ID=$(curl -sf "$API_URL/rest/v1/enseignes?select=id&code=eq.lidl" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")
curl -sf -X POST "$API_URL/rest/v1/offres_magasin" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"$OFFRE_TEST_PERIME\",\"produit_canonique_id\":\"$PRODUIT_ID\",\"enseigne_id\":\"$ENSEIGNE_ID\",\"format\":\"test\",\"quantite\":1,\"unite\":\"kg\"}" > /dev/null
curl -sf -X POST "$API_URL/rest/v1/prix_historique" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"offre_id\":\"$OFFRE_TEST_PERIME\",\"prix\":4.20,\"prix_unitaire\":4.20,\"source\":\"scraping\",\"collecte_le\":\"$(date -u -d '60 days ago' +%Y-%m-%dT%H:%M:%S)Z\"}" > /dev/null

echo "--- Verification : ce prix perime (seule observation de cette offre) doit etre signale via expire=true ---"
EXPIRE=$(curl -sf "$API_URL/rest/v1/prix_courant?offre_id=eq.$OFFRE_TEST_PERIME&select=expire" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].expire))")
if [ "$EXPIRE" != "true" ]; then
  echo "ECHEC : le prix perime injecte devrait donner expire=true, obtenu=$EXPIRE"
  FAILED=1
else
  echo "OK : expire=true, le prix perime est bien signale (pas utilise silencieusement)"
fi

echo "--- Injection d'un prix anormal (variation +185% vs l'observation precedente) ---"
curl -sf -X POST "$API_URL/rest/v1/prix_historique" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2\",\"offre_id\":\"$OFFRE_MIGROS_1KG\",\"prix\":12.00,\"prix_unitaire\":12.00,\"source\":\"scraping\",\"collecte_le\":\"$(date -u +%Y-%m-%dT%H:%M:%S)Z\"}" > /dev/null

echo "--- Verification : cette ligne doit etre signalee dans prix_anomalies ---"
ANOMALIE=$(curl -sf "$API_URL/rest/v1/prix_anomalies?id=eq.aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2&select=variation_extreme" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].variation_extreme))")
if [ "$ANOMALIE" != "true" ]; then
  echo "ECHEC : la variation extreme devrait etre signalee (variation_extreme=true), obtenu=$ANOMALIE"
  FAILED=1
else
  echo "OK : variation_extreme=true, l'anomalie est bien detectee"
fi

echo "--- Doublon exact (meme offre, meme collecte_le) : doit etre rejete par la contrainte ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/rest/v1/prix_historique" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" \
  -d "{\"offre_id\":\"$OFFRE_MIGROS_1KG\",\"prix\":4.20,\"prix_unitaire\":4.20,\"source\":\"scraping\",\"collecte_le\":\"2026-07-20T08:00:00Z\"}")
if [ "$HTTP_CODE" = "201" ]; then
  echo "ECHEC : un doublon exact (offre_id, collecte_le) a ete accepte, devrait etre rejete"
  FAILED=1
else
  echo "OK : doublon exact rejete (HTTP $HTTP_CODE)"
fi

echo "--- Rapport de couverture/fraicheur par enseigne : doit renvoyer des lignes ---"
N_LIGNES_RAPPORT=$(curl -sf "$API_URL/rest/v1/rapport_fraicheur_prix_par_enseigne?select=enseigne" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_LIGNES_RAPPORT" -lt 6 ]; then
  echo "ECHEC : rapport_fraicheur_prix_par_enseigne devrait avoir 6 enseignes (referentiel COUR-16), obtenu=$N_LIGNES_RAPPORT"
  FAILED=1
else
  echo "OK : rapport disponible pour $N_LIGNES_RAPPORT enseignes"
fi

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification qualite des prix : ECHEC"
  exit 1
fi

echo ""
echo "Verification qualite des prix : OK"
