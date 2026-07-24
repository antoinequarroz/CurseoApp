#!/bin/bash
# COUR-24 : reproduit la Verification du ticket ("validation manuelle avec
# un compte Famille") au niveau backend, faute de simulateur disponible dans
# cet environnement — exerce exactement les operations REST que
# lib/membresFoyerRepository.ts effectue (creation du foyer a la volee,
# ajout/lecture/modification/retrait d'un membre) avec un VRAI compte
# authentifie de palier Famille, via son propre JWT (pas service_role), pour
# prouver que le parcours complet fonctionne sous la RLS reelle.
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

EMAIL="verify-famille-crud@coursia.test"
PASSWORD="verify-famille-password-test"
FAILED=0
USER_ID=""

nettoyer() {
  [ -n "$USER_ID" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$USER_ID" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
}
trap nettoyer EXIT

echo "--- Compte de test palier Famille ---"
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
  -d "{\"id\":\"$USER_ID\",\"prenom\":\"Famille Test\",\"abonnement\":\"famille\"}" > /dev/null

echo "--- fetchOuCreerFoyerId : aucun foyer au depart, cree a la volee par l'utilisateur lui-meme ---"
FOYER_INITIAL=$(curl -sf "$API_URL/rest/v1/foyers?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$FOYER_INITIAL" != "0" ]; then
  echo "ECHEC : un foyer existait deja avant creation (test non isole)"
  FAILED=1
fi
FOYER_ID=$(curl -sf -X POST "$API_URL/rest/v1/foyers" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"responsable_id\":\"$USER_ID\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")
if [ -n "$FOYER_ID" ]; then
  echo "OK : l'utilisateur Famille a pu creer son propre foyer (foyer_id=$FOYER_ID)"
else
  echo "ECHEC : creation du foyer par l'utilisateur lui-meme a echoue"
  FAILED=1
fi

echo "--- ajouterMembre : l'utilisateur ajoute un membre a son propre foyer ---"
MEMBRE_ID=$(curl -sf -X POST "$API_URL/rest/v1/membres_foyer" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"foyer_id\":\"$FOYER_ID\",\"prenom\":\"Enfant Test\",\"age\":7,\"regime\":[\"vegetarien\"],\"allergies\":[\"arachide\"]}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")
if [ -n "$MEMBRE_ID" ]; then
  echo "OK : membre ajoute (id=$MEMBRE_ID)"
else
  echo "ECHEC : ajout de membre refuse"
  FAILED=1
fi

echo "--- fetchMembresFoyer : le responsable (est_responsable=true) n'apparait jamais dans la liste geree ---"
curl -sf -X POST "$API_URL/rest/v1/membres_foyer" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"foyer_id\":\"$FOYER_ID\",\"profil_id\":\"$USER_ID\",\"prenom\":\"Responsable\",\"est_responsable\":true}" > /dev/null
N_MEMBRES_GERES=$(curl -sf "$API_URL/rest/v1/membres_foyer?foyer_id=eq.$FOYER_ID&est_responsable=eq.false&select=id" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_MEMBRES_GERES" != "1" ]; then
  echo "ECHEC : la liste geree devrait contenir 1 membre (hors responsable), obtenu=$N_MEMBRES_GERES"
  FAILED=1
else
  echo "OK : le responsable est bien exclu de la liste des membres geres"
fi

echo "--- modifierMembre : mise a jour du regime/allergies ---"
curl -sf -X PATCH "$API_URL/rest/v1/membres_foyer?id=eq.$MEMBRE_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"regime":["vegetarien","sans_lactose"],"allergies":["arachide","gluten"]}' > /dev/null
N_ALLERGIES=$(curl -sf "$API_URL/rest/v1/membres_foyer?id=eq.$MEMBRE_ID&select=allergies" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].allergies.length))")
if [ "$N_ALLERGIES" != "2" ]; then
  echo "ECHEC : la modification des allergies n'a pas ete prise en compte, obtenu=$N_ALLERGIES"
  FAILED=1
else
  echo "OK : le membre a bien ete modifie (2 allergies)"
fi

echo "--- retirerMembre : suppression du membre par le responsable ---"
curl -sf -X DELETE "$API_URL/rest/v1/membres_foyer?id=eq.$MEMBRE_ID" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" > /dev/null
N_APRES_SUPPRESSION=$(curl -sf "$API_URL/rest/v1/membres_foyer?id=eq.$MEMBRE_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_APRES_SUPPRESSION" != "0" ]; then
  echo "ECHEC : le membre existe toujours apres retrait"
  FAILED=1
else
  echo "OK : le membre a bien ete retire"
fi

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification CRUD membres_foyer : ECHEC"
  exit 1
fi

echo ""
echo "Verification CRUD membres_foyer : OK"
