#!/bin/bash
# COUR-29 : reproduit la Verification litterale du ticket — teste les
# droits avec auteur, autre utilisateur et role de moderation. Meme
# technique que COUR-23/24/26/28 : trois VRAIS comptes authentifies via
# l'API Admin GoTrue, un marque moderateur via profils.est_admin.
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

PASSWORD="verify-recettes-password-test"
FAILED=0
AUTEUR_ID=""
AUTRE_ID=""
MODERATEUR_ID=""

nettoyer() {
  [ -n "$AUTEUR_ID" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$AUTEUR_ID" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
  [ -n "$AUTRE_ID" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$AUTRE_ID" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
  [ -n "$MODERATEUR_ID" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$MODERATEUR_ID" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
}
trap nettoyer EXIT

creer_utilisateur() {
  curl -sf -X POST "$API_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))"
}
connecter_utilisateur() {
  curl -sf -X POST "$API_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).access_token))"
}

echo "--- Comptes de test : auteur, autre utilisateur, moderateur ---"
AUTEUR_ID=$(creer_utilisateur "verify-recette-auteur@coursia.test")
AUTRE_ID=$(creer_utilisateur "verify-recette-autre@coursia.test")
MODERATEUR_ID=$(creer_utilisateur "verify-recette-moderateur@coursia.test")
TOKEN_AUTEUR=$(connecter_utilisateur "verify-recette-auteur@coursia.test")
TOKEN_AUTRE=$(connecter_utilisateur "verify-recette-autre@coursia.test")
TOKEN_MODERATEUR=$(connecter_utilisateur "verify-recette-moderateur@coursia.test")

curl -sf -X POST "$API_URL/rest/v1/profils" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"$AUTEUR_ID\",\"prenom\":\"Auteur\"}" > /dev/null
curl -sf -X POST "$API_URL/rest/v1/profils" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"$AUTRE_ID\",\"prenom\":\"Autre\"}" > /dev/null
curl -sf -X POST "$API_URL/rest/v1/profils" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"$MODERATEUR_ID\",\"prenom\":\"Moderateur\",\"est_admin\":true}" > /dev/null

ALLERGENE_AUCUN_ID=$(curl -sf "$API_URL/rest/v1/allergenes?select=id&code=eq.aucun" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")

echo "--- L'auteur cree sa recette en brouillon ---"
RECETTE_ID=$(curl -sf -X POST "$API_URL/rest/v1/recettes" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTEUR" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"titre\":\"Recette communautaire test\",\"auteur_id\":\"$AUTEUR_ID\",\"est_communautaire\":true,\"statut_publication\":\"brouillon\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")
if [ -n "$RECETTE_ID" ]; then echo "OK : recette creee en brouillon"; else echo "ECHEC : creation refusee"; FAILED=1; fi

echo "--- Un utilisateur authentifie ne peut PAS creer une recette du catalogue officiel (est_communautaire=false) ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/rest/v1/recettes" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTEUR" -H "Content-Type: application/json" \
  -d "{\"titre\":\"Fausse recette officielle\",\"auteur_id\":\"$AUTEUR_ID\",\"est_communautaire\":false,\"statut_publication\":\"brouillon\"}")
if [ "$HTTP_CODE" = "201" ]; then echo "ECHEC : insertion d'une recette non-communautaire acceptee"; FAILED=1; else echo "OK : rejetee (HTTP $HTTP_CODE)"; fi

echo "--- Visibilite : l'autre utilisateur ne voit PAS le brouillon, le moderateur si ---"
N_AUTRE=$(curl -sf "$API_URL/rest/v1/recettes?id=eq.$RECETTE_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTRE" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
N_MODERATEUR=$(curl -sf "$API_URL/rest/v1/recettes?id=eq.$RECETTE_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_MODERATEUR" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_AUTRE" = "0" ] && [ "$N_MODERATEUR" = "1" ]; then
  echo "OK : brouillon invisible pour l'autre utilisateur, visible pour le moderateur"
else
  echo "ECHEC : visibilite incorrecte (autre=$N_AUTRE, moderateur=$N_MODERATEUR)"
  FAILED=1
fi

echo "--- Soumission refusee sans champs obligatoires (source/droits_image/allergenes) ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API_URL/rest/v1/recettes?id=eq.$RECETTE_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTEUR" -H "Content-Type: application/json" \
  -d '{"statut_publication":"en_attente"}')
if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "ECHEC : soumission acceptee sans champs obligatoires"
  FAILED=1
else
  echo "OK : soumission rejetee (HTTP $HTTP_CODE)"
fi

echo "--- Soumission complete (source, droits_image, allergene declare) acceptee ---"
curl -sf -X PATCH "$API_URL/rest/v1/recettes?id=eq.$RECETTE_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTEUR" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"source":"Recette perso","droits_image":"Photo personnelle"}' > /dev/null
curl -sf -X POST "$API_URL/rest/v1/recette_allergenes" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTEUR" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"recette_id\":\"$RECETTE_ID\",\"allergene_id\":\"$ALLERGENE_AUCUN_ID\"}" > /dev/null
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API_URL/rest/v1/recettes?id=eq.$RECETTE_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTEUR" -H "Content-Type: application/json" \
  -d '{"statut_publication":"en_attente"}')
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
  echo "OK : soumission acceptee une fois les champs obligatoires renseignes"
else
  echo "ECHEC : soumission complete refusee (HTTP $HTTP_CODE)"
  FAILED=1
fi

echo "--- en_attente : toujours invisible pour l'autre utilisateur ---"
N_AUTRE=$(curl -sf "$API_URL/rest/v1/recettes?id=eq.$RECETTE_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTRE" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_AUTRE" = "0" ]; then echo "OK : en_attente toujours invisible pour l'autre utilisateur"; else echo "ECHEC : en_attente visible par l'autre utilisateur"; FAILED=1; fi

echo "--- L'autre utilisateur ne peut PAS modifier la recette de l'auteur ---"
curl -s -o /dev/null -X PATCH "$API_URL/rest/v1/recettes?id=eq.$RECETTE_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTRE" -H "Content-Type: application/json" \
  -d '{"titre":"Vole"}' || true
TITRE_APRES=$(curl -sf "$API_URL/rest/v1/recettes?id=eq.$RECETTE_ID&select=titre" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].titre))")
if [ "$TITRE_APRES" = "Vole" ]; then echo "ECHEC : l'autre utilisateur a pu modifier la recette"; FAILED=1; else echo "OK : modification par l'autre utilisateur sans effet"; fi

echo "--- Le moderateur peut publier la recette ---"
curl -sf -X PATCH "$API_URL/rest/v1/recettes?id=eq.$RECETTE_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_MODERATEUR" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"statut_publication":"publiee"}' > /dev/null
N_AUTRE=$(curl -sf "$API_URL/rest/v1/recettes?id=eq.$RECETTE_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTRE" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_AUTRE" = "1" ]; then echo "OK : une fois publiee, visible par tous"; else echo "ECHEC : recette publiee toujours invisible"; FAILED=1; fi

echo "--- Signalements : l'autre utilisateur signale, le moderateur voit et traite, l'auteur du signalement ne peut pas le modifier ---"
SIGNALEMENT_ID=$(curl -sf -X POST "$API_URL/rest/v1/signalements" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTRE" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"recette_id\":\"$RECETTE_ID\",\"signale_par\":\"$AUTRE_ID\",\"raison\":\"information_incorrecte\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")

N_VU_PAR_AUTEUR=$(curl -sf "$API_URL/rest/v1/signalements?id=eq.$SIGNALEMENT_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTEUR" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
N_VU_PAR_MODERATEUR=$(curl -sf "$API_URL/rest/v1/signalements?id=eq.$SIGNALEMENT_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_MODERATEUR" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_VU_PAR_AUTEUR" = "0" ] && [ "$N_VU_PAR_MODERATEUR" = "1" ]; then
  echo "OK : le signalement n'est visible que par son auteur et le moderateur (pas l'auteur de la recette)"
else
  echo "ECHEC : visibilite du signalement incorrecte (auteur_recette=$N_VU_PAR_AUTEUR, moderateur=$N_VU_PAR_MODERATEUR)"
  FAILED=1
fi

curl -s -o /dev/null -X PATCH "$API_URL/rest/v1/signalements?id=eq.$SIGNALEMENT_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTRE" -H "Content-Type: application/json" \
  -d '{"statut":"valide"}' || true
STATUT_APRES_TENTATIVE=$(curl -sf "$API_URL/rest/v1/signalements?id=eq.$SIGNALEMENT_ID&select=statut" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].statut))")
if [ "$STATUT_APRES_TENTATIVE" = "valide" ]; then
  echo "ECHEC : le signaleur lui-meme a pu modifier le statut de son signalement"
  FAILED=1
else
  echo "OK : le signaleur ne peut pas modifier son propre signalement (RLS sans effet)"
fi

curl -sf -X PATCH "$API_URL/rest/v1/signalements?id=eq.$SIGNALEMENT_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_MODERATEUR" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"statut\":\"examine\",\"moderateur_id\":\"$MODERATEUR_ID\",\"traite_le\":\"$(date -u +%Y-%m-%dT%H:%M:%S)Z\"}" > /dev/null
STATUT_SIGNALEMENT=$(curl -sf "$API_URL/rest/v1/signalements?id=eq.$SIGNALEMENT_ID&select=statut" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].statut))")
if [ "$STATUT_SIGNALEMENT" = "examine" ]; then echo "OK : le moderateur a bien traite le signalement"; else echo "ECHEC : le moderateur n'a pas pu traiter le signalement"; FAILED=1; fi

echo "--- L'auteur peut retirer sa propre recette ---"
curl -sf -X DELETE "$API_URL/rest/v1/recettes?id=eq.$RECETTE_ID" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_AUTEUR" > /dev/null
N_APRES_SUPPRESSION=$(curl -sf "$API_URL/rest/v1/recettes?id=eq.$RECETTE_ID&select=id" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))")
if [ "$N_APRES_SUPPRESSION" = "0" ]; then echo "OK : recette retiree par son auteur"; else echo "ECHEC : la recette existe toujours"; FAILED=1; fi

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification recettes communautaires : ECHEC"
  exit 1
fi

echo ""
echo "Verification recettes communautaires : OK"
