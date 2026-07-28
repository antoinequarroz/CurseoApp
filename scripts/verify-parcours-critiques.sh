#!/bin/bash
# COUR-39 : test d'integration bout-en-bout des parcours critiques, avec
# DEUX utilisateurs authentifies distincts, sur un environnement reconstruit
# integralement par les migrations (supabase start / db reset).
#
# Les scripts precedents couvrent chacun un domaine isole (COUR-23 foyers,
# COUR-26 planning, COUR-29 communaute...). Celui-ci verifie les domaines
# ENSEMBLE, dans l'ordre d'un vrai parcours utilisateur, et couvre le
# domaine qui n'avait aucun test d'isolation deux-utilisateurs : les
# abonnements (profils.abonnement + journal du webhook).
#
# Chaque bloc suit la Verification du ticket : "les scenarios autorises
# reussissent et les acces interdits echouent explicitement" — donc pour
# chaque domaine on teste le chemin autorise ET le chemin interdit.
set -euo pipefail

STATUS=$(npx supabase status -o json)
API_URL=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).API_URL))")
ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY))")
SERVICE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))")

EMAIL_A="verify-parcours-a@coursia.test"
EMAIL_B="verify-parcours-b@coursia.test"
PASSWORD="verify-parcours-password-test"
FAILED=0
USER_A_ID=""
USER_B_ID=""

# Critere 4 du ticket : "les donnees sont nettoyees".
#
# Le nettoyage se fait table par table, dans l'ordre inverse des dependances,
# AVANT de supprimer les comptes auth. Contrairement a ce que supposent les
# verify-*.sh precedents, supprimer un compte GoTrue ne suffit pas : la
# contrainte `profils_id_fkey` (profils.id -> auth.users.id) n'a pas de
# `on delete cascade`, donc la suppression du compte echoue tant qu'un profil
# le reference ("violates foreign key constraint profils_id_fkey"). Comme ces
# scripts font suivre l'appel d'un `|| true`, l'echec passait inapercu et les
# lignes de test survivaient a l'execution.
supprimer() {
  curl -sf -X DELETE "$API_URL/rest/v1/$1" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
}

nettoyer() {
  [ -z "$USER_A_ID" ] && [ -z "$USER_B_ID" ] && return 0
  local CIBLES="in.($USER_A_ID,$USER_B_ID)"
  supprimer "membres_foyer?profil_id=$CIBLES"
  # Les membres sans compte de connexion sont rattaches au foyer, pas au profil.
  for FOYER in $(curl -sf "$API_URL/rest/v1/foyers?responsable_id=$CIBLES&select=id" \
      -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
      | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).map(f=>f.id).join(' ')))"); do
    supprimer "membres_foyer?foyer_id=eq.$FOYER"
  done
  supprimer "foyers?responsable_id=$CIBLES"
  supprimer "repas_planifies?profil_id=$CIBLES"
  supprimer "recettes?auteur_id=$CIBLES"
  supprimer "profils?id=$CIBLES"
  [ -n "$USER_A_ID" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$USER_A_ID" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
  [ -n "$USER_B_ID" ] && curl -sf -X DELETE "$API_URL/auth/v1/admin/users/$USER_B_ID" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null || true
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

compter() {
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).length)}catch(e){console.log('erreur')}})"
}

lire_abonnement() {
  curl -sf "$API_URL/rest/v1/profils?id=eq.$1&select=abonnement" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].abonnement))"
}

echo "=== Setup : deux comptes authentifies distincts ==="
USER_A_ID=$(creer_utilisateur "$EMAIL_A")
USER_B_ID=$(creer_utilisateur "$EMAIL_B")
TOKEN_A=$(connecter_utilisateur "$EMAIL_A")
TOKEN_B=$(connecter_utilisateur "$EMAIL_B")

# Les profils sont crees par les utilisateurs eux-memes (comme le fait
# l'onboarding reel), pas par service_role : c'est ce chemin-la qui doit
# etre garde.
curl -sf -X POST "$API_URL/rest/v1/profils" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"$USER_A_ID\",\"prenom\":\"Parcours A\",\"budget_hebdo\":200}" > /dev/null
curl -sf -X POST "$API_URL/rest/v1/profils" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"$USER_B_ID\",\"prenom\":\"Parcours B\"}" > /dev/null

echo ""
echo "=== 1. Abonnements ==="

echo "--- INTERDIT : creer son profil en se declarant deja 'famille' ---"
curl -sf -X DELETE "$API_URL/rest/v1/profils?id=eq.$USER_B_ID" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" > /dev/null
curl -sf -X POST "$API_URL/rest/v1/profils" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"id\":\"$USER_B_ID\",\"prenom\":\"Parcours B\",\"abonnement\":\"famille\"}" > /dev/null
ABO_B=$(lire_abonnement "$USER_B_ID")
if [ "$ABO_B" != "gratuit" ]; then
  echo "ECHEC : un nouveau profil a pu naitre au palier '$ABO_B' sans aucun achat"
  FAILED=1
else
  echo "OK : palier force a 'gratuit' a la creation, la valeur proposee est ignoree"
fi

echo "--- INTERDIT : s'auto-attribuer un palier payant (escalade de privileges) ---"
curl -sf -X PATCH "$API_URL/rest/v1/profils?id=eq.$USER_A_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d '{"abonnement":"famille"}' > /dev/null || true
ABO_A=$(lire_abonnement "$USER_A_ID")
if [ "$ABO_A" != "gratuit" ]; then
  echo "ECHEC : l'utilisateur A s'est auto-attribue le palier '$ABO_A' via l'API REST"
  FAILED=1
else
  echo "OK : le palier reste 'gratuit', l'ecriture cliente est neutralisee"
fi

echo "--- AUTORISE : les autres preferences du meme profil restent modifiables ---"
curl -sf -X PATCH "$API_URL/rest/v1/profils?id=eq.$USER_A_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d '{"budget_hebdo":175,"abonnement":"premium"}' > /dev/null || true
BUDGET_A=$(curl -sf "$API_URL/rest/v1/profils?id=eq.$USER_A_ID&select=budget_hebdo" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].budget_hebdo))")
if [ "$BUDGET_A" != "175" ] || [ "$(lire_abonnement "$USER_A_ID")" != "gratuit" ]; then
  echo "ECHEC : la garde doit neutraliser SEULEMENT abonnement (budget=$BUDGET_A, palier=$(lire_abonnement "$USER_A_ID"))"
  FAILED=1
else
  echo "OK : budget mis a jour, palier neutralise dans le meme UPDATE"
fi

echo "--- AUTORISE : le webhook (service_role) promeut bien l'utilisateur A ---"
curl -sf -X PATCH "$API_URL/rest/v1/profils?id=eq.$USER_A_ID" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" \
  -d '{"abonnement":"famille"}' > /dev/null
if [ "$(lire_abonnement "$USER_A_ID")" != "famille" ]; then
  echo "ECHEC : la garde bloque aussi le webhook — la source de verite ne peut plus ecrire"
  FAILED=1
else
  echo "OK : service_role reste seul habilite a changer le palier"
fi

echo "--- INTERDIT : l'utilisateur B lit le profil de l'utilisateur A ---"
N=$(curl -sf "$API_URL/rest/v1/profils?id=eq.$USER_A_ID&select=prenom,budget_hebdo" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" | compter)
if [ "$N" != "0" ]; then
  echo "ECHEC : l'utilisateur B a lu le profil de A ($N ligne(s))"
  FAILED=1
else
  echo "OK : profil de A invisible pour B"
fi

echo "--- INTERDIT : lire le journal d'evenements d'abonnement (reserve service_role) ---"
N=$(curl -sf "$API_URL/rest/v1/webhook_evenements_abonnement?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" | compter)
if [ "$N" != "0" ]; then
  echo "ECHEC : le journal du webhook est lisible par un utilisateur authentifie ($N ligne(s))"
  FAILED=1
else
  echo "OK : journal du webhook invisible pour un utilisateur authentifie"
fi

echo ""
echo "=== 2. Foyer (A est 'famille', B est 'gratuit') ==="

echo "--- AUTORISE : A cree son foyer et ajoute un membre ---"
FOYER_A_ID=$(curl -sf -X POST "$API_URL/rest/v1/foyers" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"responsable_id\":\"$USER_A_ID\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/rest/v1/membres_foyer" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d "{\"foyer_id\":\"$FOYER_A_ID\",\"prenom\":\"Enfant A\",\"age\":7,\"allergies\":[\"arachide\"]}")
if [ "$HTTP_CODE" != "201" ]; then
  echo "ECHEC : un responsable 'famille' n'a pas pu ajouter un membre (HTTP $HTTP_CODE)"
  FAILED=1
else
  echo "OK : ajout de membre accepte pour un compte Famille"
fi

echo "--- INTERDIT : B (gratuit) cree un foyer et tente d'y ajouter un membre ---"
FOYER_B_ID=$(curl -sf -X POST "$API_URL/rest/v1/foyers" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"responsable_id\":\"$USER_B_ID\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/rest/v1/membres_foyer" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" \
  -d "{\"foyer_id\":\"$FOYER_B_ID\",\"prenom\":\"Enfant B\",\"age\":5}")
if [ "$HTTP_CODE" = "201" ]; then
  echo "ECHEC : un compte gratuit a pu ajouter un membre du foyer (paywall contourne)"
  FAILED=1
else
  echo "OK : ajout refuse cote serveur pour un compte gratuit (HTTP $HTTP_CODE)"
fi

echo "--- INTERDIT : B lit les membres du foyer de A ---"
N=$(curl -sf "$API_URL/rest/v1/membres_foyer?foyer_id=eq.$FOYER_A_ID&select=prenom,allergies" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" | compter)
if [ "$N" != "0" ]; then
  echo "ECHEC : B a lu $N membre(s) du foyer de A (fuite de donnees de sante)"
  FAILED=1
else
  echo "OK : membres du foyer de A invisibles pour B"
fi

echo ""
echo "=== 3. Planning ==="

RECETTE_CATALOGUE_ID=$(curl -sf "$API_URL/rest/v1/recettes?select=id&statut_publication=eq.publiee&limit=1" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")

echo "--- AUTORISE : A planifie un repas et le relit ---"
curl -sf -X POST "$API_URL/rest/v1/repas_planifies" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"profil_id\":\"$USER_A_ID\",\"date_repas\":\"2026-09-07\",\"moment\":\"soir\",\"recette_id\":\"$RECETTE_CATALOGUE_ID\",\"portions\":4}" > /dev/null
N=$(curl -sf "$API_URL/rest/v1/repas_planifies?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" | compter)
if [ "$N" != "1" ]; then
  echo "ECHEC : A devrait voir son unique repas planifie, obtenu=$N"
  FAILED=1
else
  echo "OK : repas planifie cree et relu par son proprietaire"
fi

echo "--- INTERDIT : B lit le planning de A ---"
N=$(curl -sf "$API_URL/rest/v1/repas_planifies?profil_id=eq.$USER_A_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" | compter)
if [ "$N" != "0" ]; then
  echo "ECHEC : B a lu le planning de A ($N ligne(s))"
  FAILED=1
else
  echo "OK : planning de A invisible pour B"
fi

echo "--- INTERDIT : B modifie le planning de A ---"
curl -sf -X PATCH "$API_URL/rest/v1/repas_planifies?profil_id=eq.$USER_A_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" \
  -d '{"portions":99}' > /dev/null || true
PORTIONS=$(curl -sf "$API_URL/rest/v1/repas_planifies?profil_id=eq.$USER_A_ID&select=portions" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].portions))")
if [ "$PORTIONS" = "99" ]; then
  echo "ECHEC : B a modifie le planning de A"
  FAILED=1
else
  echo "OK : l'ecriture croisee n'a affecte aucune ligne"
fi

echo ""
echo "=== 4. Recettes (catalogue officiel) ==="

echo "--- AUTORISE : le catalogue publie est visible par les deux utilisateurs ---"
N_A=$(curl -sf "$API_URL/rest/v1/recettes?id=eq.$RECETTE_CATALOGUE_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" | compter)
N_B=$(curl -sf "$API_URL/rest/v1/recettes?id=eq.$RECETTE_CATALOGUE_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" | compter)
if [ "$N_A" != "1" ] || [ "$N_B" != "1" ]; then
  echo "ECHEC : le catalogue publie doit etre lisible par tous (A=$N_A, B=$N_B)"
  FAILED=1
else
  echo "OK : catalogue publie partage entre les deux utilisateurs"
fi

echo "--- INTERDIT : injecter une recette dans le catalogue officiel ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/rest/v1/recettes" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" \
  -d "{\"titre\":\"Fausse officielle\",\"auteur_id\":\"$USER_B_ID\",\"est_communautaire\":false,\"statut_publication\":\"publiee\"}")
if [ "$HTTP_CODE" = "201" ]; then
  echo "ECHEC : un utilisateur a insere une recette dans le catalogue officiel"
  FAILED=1
else
  echo "OK : insertion au catalogue officiel refusee (HTTP $HTTP_CODE)"
fi

echo ""
echo "=== 5. Communaute ==="

echo "--- AUTORISE : A soumet une recette communautaire ---"
RECETTE_COMMU_ID=$(curl -sf -X POST "$API_URL/rest/v1/recettes" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"titre\":\"Parcours communautaire\",\"auteur_id\":\"$USER_A_ID\",\"est_communautaire\":true,\"statut_publication\":\"brouillon\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].id))")
if [ -z "$RECETTE_COMMU_ID" ]; then
  echo "ECHEC : A n'a pas pu soumettre sa recette communautaire"
  FAILED=1
else
  echo "OK : recette communautaire creee par son auteur"
fi

echo "--- INTERDIT : B lit le brouillon de A ---"
N=$(curl -sf "$API_URL/rest/v1/recettes?id=eq.$RECETTE_COMMU_ID&select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" | compter)
if [ "$N" != "0" ]; then
  echo "ECHEC : B a lu le brouillon communautaire de A"
  FAILED=1
else
  echo "OK : brouillon de A invisible pour B"
fi

echo "--- INTERDIT : B publie lui-meme la recette de A (sans etre moderateur) ---"
curl -sf -X PATCH "$API_URL/rest/v1/recettes?id=eq.$RECETTE_COMMU_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" \
  -d '{"statut_publication":"publiee"}' > /dev/null || true
STATUT=$(curl -sf "$API_URL/rest/v1/recettes?id=eq.$RECETTE_COMMU_ID&select=statut_publication" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)[0].statut_publication))")
if [ "$STATUT" = "publiee" ]; then
  echo "ECHEC : B a publie la recette de A sans droits de moderation"
  FAILED=1
else
  echo "OK : publication refusee, statut inchange ($STATUT)"
fi

echo ""
echo "=== Anonyme : aucune donnee personnelle visible ==="
for TABLE in profils foyers membres_foyer repas_planifies; do
  N=$(curl -sf "$API_URL/rest/v1/$TABLE?select=*" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" | compter)
  if [ "$N" != "0" ]; then
    echo "ECHEC : $TABLE expose $N ligne(s) a un utilisateur anonyme"
    FAILED=1
  else
    echo "OK : $TABLE invisible pour un utilisateur anonyme"
  fi
done

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "Verification parcours critiques : ECHEC"
  exit 1
fi

echo ""
echo "Verification parcours critiques : OK"
