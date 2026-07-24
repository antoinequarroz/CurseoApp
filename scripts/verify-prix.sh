#!/bin/bash
# COUR-16 : verifie la comparaison de formats + prix courant/historique sur
# une instance Supabase locale (deja demarree, seed COUR-16 charge). PostgREST
# uniquement (portable CI), meme approche que verify-allergenes.sh.
#
# Usage : bash scripts/verify-prix.sh (depuis la racine du projet, avec la
# stack Supabase locale deja demarree)
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

PRODUIT="77777777-7777-7777-7777-777777777701"
OFFRE_MIGROS_1KG="88888888-8888-8888-8888-888888888801"
FAILED=0

echo "--- Comparaison de formats (prix_courant, Riz basmati) ---"
COMPARATIF=$(curl -sf "$API_URL/rest/v1/prix_courant?produit_canonique_id=eq.$PRODUIT&select=format,prix_unitaire&order=prix_unitaire.asc" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY")
N=$(echo "$COMPARATIF" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N" != "3" ]; then
  echo "ECHEC : 3 offres attendues pour Riz basmati, trouve $N"
  FAILED=1
else
  echo "OK : 3 offres (2 formats Migros + 1 Coop) comparables via prix_unitaire"
fi
MOINS_CHER=$(echo "$COMPARATIF" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].format))")
if [ "$MOINS_CHER" != "1kg" ]; then
  echo "ECHEC : le format le moins cher au kilo devrait etre '1kg' (Migros, 4.20/kg), trouve '$MOINS_CHER'"
  FAILED=1
else
  echo "OK : le format 1kg (Migros) est bien le moins cher au kilo (500g plus cher au kilo, cas realiste)"
fi

echo "--- Prix courant = derniere observation, pas la premiere ---"
PRIX_COURANT=$(curl -sf "$API_URL/rest/v1/prix_courant?offre_id=eq.$OFFRE_MIGROS_1KG&select=prix" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].prix))")
if [ "$PRIX_COURANT" != "4.2" ]; then
  echo "ECHEC : prix courant attendu=4.2 (le plus recent) obtenu=$PRIX_COURANT"
  FAILED=1
else
  echo "OK : prix courant = $PRIX_COURANT (dernier releve, pas l'ancien 4.50)"
fi

echo "--- Historique complet de l'offre (2 observations conservees) ---"
N_HIST=$(curl -sf "$API_URL/rest/v1/prix_historique?offre_id=eq.$OFFRE_MIGROS_1KG&select=id" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_HIST" != "2" ]; then
  echo "ECHEC : 2 lignes d'historique attendues, trouve $N_HIST"
  FAILED=1
else
  echo "OK : historique conserve les 2 changements de prix (4.50 -> 4.20)"
fi

echo "--- Data API : lecture publique OK, ecriture anon refusee (RLS explicite) ---"
HTTP_ECRITURE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/rest/v1/prix_historique" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"offre_id\":\"$OFFRE_MIGROS_1KG\",\"prix\":1,\"prix_unitaire\":1,\"source\":\"scraping\"}")
if [ "$HTTP_ECRITURE" = "201" ]; then
  echo "ECHEC : anon a reussi a ecrire dans prix_historique (devrait etre refuse)"
  FAILED=1
else
  echo "OK : ecriture anon refusee (HTTP $HTTP_ECRITURE)"
fi

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification prix/enseignes/formats : ECHEC"
  exit 1
fi

echo ""
echo "Verification prix/enseignes/formats : OK"
