// Webhook RevenueCat — a configurer dans le dashboard RevenueCat :
// https://xxx.supabase.co/functions/v1/revenuecat-webhook
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { comparaisonTempsConstant } from '../_shared/crypto.ts';
import { SECURITY_HEADERS, reponsePreflight } from '../_shared/security-headers.ts';

const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

// Doit rester synchronise avec les 4 paliers de lib/revenuecat.ts (PALIERS_ABONNEMENT)
// et la contrainte `check (abonnement in (...))` de supabase/schema.sql.
// Ordre = priorite du plus haut palier au plus bas (voir COUR-31,
// docs/entitlements/matrice-droits.md) — meme ordre que
// niveauDepuisCustomerInfo() dans lib/revenuecat.ts (derivation cote
// client), pour ne jamais diverger si RevenueCat renvoie plusieurs
// entitlements actifs simultanement.
const PALIERS_PAR_PRIORITE = ['famille', 'premium', 'standard'];
const PALIERS_VALIDES = new Set(['gratuit', ...PALIERS_PAR_PRIORITE]);

/** Le plus haut palier parmi les entitlements actifs, ou 'gratuit' si aucun. */
function palierPrioritaire(entitlementIds: string[] | undefined): string {
  const actifs = new Set(entitlementIds ?? []);
  return PALIERS_PAR_PRIORITE.find((p) => actifs.has(p)) ?? 'gratuit';
}

interface EvenementRevenueCat {
  id?: string;
  app_user_id?: string;
  type?: string;
  event_timestamp_ms?: number;
  entitlement_ids?: string[];
  /** UNSUBSCRIBE | BILLING_ERROR | DEVELOPER_INITIATED | PRICE_INCREASE | CUSTOMER_SUPPORT | REFUND | ... */
  cancel_reason?: string;
}

serve(async (req) => {
  const preflight = reponsePreflight(req);
  if (preflight) return preflight;

  const authHeader = req.headers.get('Authorization') ?? '';
  // RevenueCat V1 authentifie ses webhooks via un Authorization: Bearer <secret>
  // statique (pas de HMAC de payload) — cf. https://www.revenuecat.com/docs/webhooks
  // On compare donc ce secret en temps constant pour eviter une timing attack.
  if (!WEBHOOK_SECRET || !comparaisonTempsConstant(authHeader, `Bearer ${WEBHOOK_SECRET}`)) {
    return new Response('Non autorise', { status: 401, headers: SECURITY_HEADERS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: { event?: EvenementRevenueCat };
  try {
    body = await req.json();
  } catch {
    return new Response('Requete invalide', { status: 400, headers: SECURITY_HEADERS });
  }
  const event = body.event;
  const userId = event?.app_user_id;
  // `id`/`event_timestamp_ms` sont necessaires a l'idempotence et a la
  // detection d'ordre d'arrivee (critere COUR-34) — un evenement qui ne les
  // fournit pas ne peut pas etre traite en toute securite.
  if (!userId || !event?.type || !event.id || !event.event_timestamp_ms) {
    return new Response('Requete invalide', { status: 400, headers: SECURITY_HEADERS });
  }
  const { id: eventId, type: typeEvenement, event_timestamp_ms: horodatage } = event;

  // --- Idempotence (COUR-34) -------------------------------------------
  // `id` = event.id RevenueCat, unique par evenement (y compris sur un
  // replay automatique apres une reponse non-2xx precedente). Un doublon
  // exact est un no-op silencieux : deja traite, rien a refaire, mais on
  // repond quand meme 200 (sinon RevenueCat continuerait de reessayer un
  // evenement en realite deja applique avec succes).
  const { data: dejaTraite } = await supabase
    .from('webhook_evenements_abonnement')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  if (dejaTraite) {
    return new Response('OK (deja traite)', { status: 200, headers: SECURITY_HEADERS });
  }

  // --- Ordre d'arrivee different (COUR-34) ------------------------------
  // Les evenements RevenueCat pour un meme utilisateur peuvent arriver dans
  // le desordre (retry reseau, files distinctes cote RevenueCat). Sans
  // garde, un EXPIRATION recu apres coup pourrait ecraser un RENEWAL plus
  // recent deja applique. On ignore un evenement plus vieux que le dernier
  // deja traite pour cet utilisateur — enregistre quand meme (pour rester
  // idempotent si RE-rejoue), mais sans toucher `profils.abonnement`.
  const { data: dernierEvenement } = await supabase
    .from('webhook_evenements_abonnement')
    .select('event_timestamp_ms')
    .eq('app_user_id', userId)
    .order('event_timestamp_ms', { ascending: false })
    .limit(1)
    .maybeSingle();
  const estHorsOrdre = Boolean(dernierEvenement) && horodatage < dernierEvenement!.event_timestamp_ms;

  const enregistrerEvenement = () =>
    supabase.from('webhook_evenements_abonnement').insert({
      id: eventId,
      app_user_id: userId,
      type: typeEvenement,
      event_timestamp_ms: horodatage,
    });

  if (estHorsOrdre) {
    console.warn(`[revenuecat-webhook] Evenement ${typeEvenement} (${eventId}) hors-ordre pour ${userId}, ignore`);
    await enregistrerEvenement();
    return new Response('OK (hors-ordre, ignore)', { status: 200, headers: SECURITY_HEADERS });
  }

  // Renvoie une erreur explicite (au lieu d'avaler l'erreur et repondre 200) :
  // RevenueCat reessaie automatiquement les webhooks en echec (non-2xx), donc un
  // vrai code d'erreur permet une seconde chance au lieu d'un abonnement fige.
  // Volontairement PAS d'enregistrement dans webhook_evenements_abonnement en
  // cas d'erreur : l'evenement doit rester rejouable par RevenueCat.
  const majAbonnement = async (niveau: string): Promise<Response | null> => {
    if (!PALIERS_VALIDES.has(niveau)) {
      console.error(`[revenuecat-webhook] Palier inconnu "${niveau}" pour ${userId}`);
      return new Response(`Palier inconnu: ${niveau}`, { status: 422, headers: SECURITY_HEADERS });
    }
    const { error } = await supabase.from('profils').update({ abonnement: niveau }).eq('id', userId);
    if (error) {
      console.error(`[revenuecat-webhook] Echec update profils pour ${userId}:`, error.message);
      return new Response('Echec de la mise a jour', { status: 500, headers: SECURITY_HEADERS });
    }
    return null;
  };

  switch (typeEvenement) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE': {
      // Pas d'entitlement actif sur un evenement d'achat/renouvellement : ne
      // jamais deviner (l'ancien fallback 'standard' pouvait sur-attribuer
      // un palier, et retomber sur 'gratuit' downgraderait a tort un achat
      // reel) — rejet explicite pour forcer un retry RevenueCat plutot
      // qu'un etat fige incorrect.
      if (!event.entitlement_ids?.length) {
        console.error(`[revenuecat-webhook] Aucun entitlement actif sur ${typeEvenement} pour ${userId}`);
        return new Response('Aucun entitlement actif', { status: 422, headers: SECURITY_HEADERS });
      }
      const niveauAchat = palierPrioritaire(event.entitlement_ids);
      // palierPrioritaire() retombe sur 'gratuit' si aucun entitlement_id ne
      // correspond a un palier connu — un achat/renouvellement ne doit
      // JAMAIS aboutir a 'gratuit' silencieusement : ca masquerait un
      // entitlement RevenueCat mal configure ou pas encore mappe ici (voir
      // ENTITLEMENT_IDS, lib/revenuecat.ts) derriere un succes trompeur.
      if (niveauAchat === 'gratuit') {
        console.error(`[revenuecat-webhook] Entitlement(s) non reconnu(s) ${JSON.stringify(event.entitlement_ids)} pour ${userId}`);
        return new Response('Entitlement non reconnu', { status: 422, headers: SECURITY_HEADERS });
      }
      const erreur = await majAbonnement(niveauAchat);
      if (erreur) return erreur;
      break;
    }
    case 'CANCELLATION': {
      // COUR-34 : un remboursement (cancel_reason='REFUND', declenche par le
      // support Apple/Google apres coup) retire l'argent au fournisseur —
      // contrairement a une annulation volontaire ordinaire (l'utilisateur
      // choisit de ne pas renouveler mais garde son acces jusqu'a la fin de
      // la periode deja payee), un remboursement doit retirer le droit
      // immediatement : l'utilisateur n'a plus paye pour cette periode.
      if (event.cancel_reason === 'REFUND') {
        const erreur = await majAbonnement('gratuit');
        if (erreur) return erreur;
      }
      // Annulation ordinaire : aucune action, l'acces expire naturellement
      // (l'evenement EXPIRATION s'en chargera au bon moment).
      break;
    }
    case 'EXPIRATION': {
      const erreur = await majAbonnement('gratuit');
      if (erreur) return erreur;
      break;
    }
    case 'BILLING_ISSUE':
      // Grace period Apple de 16 jours — notifier l'utilisateur, ne pas downgrade.
      // Pas de service email transactionnel dans le repo (grep resend/sendgrid/email
      // sur supabase/functions/ ne remonte rien) : on ne l'invente pas ici.
      // A la place on insere une notification en base, affichee dans l'app au
      // prochain lancement (voir table `notifications` dans supabase/schema.sql).
      // TODO(email): brancher un envoi Resend (ou equivalent) sur INSERT dans
      // `notifications` de type 'billing_issue', pour relancer l'utilisateur
      // meme s'il ne rouvre pas l'app pendant la grace period.
      await supabase.from('notifications').insert({
        profil_id: userId,
        type: 'billing_issue',
        titre: 'Probleme de paiement',
        message:
          "Ton dernier paiement a echoue. Mets a jour ton moyen de paiement pour garder ton acces avant la fin de la periode de grace.",
      });
      break;
  }

  // Enregistre l'evenement seulement une fois traite avec succes — sinon un
  // echec (ex. majAbonnement en erreur, deja retourne plus haut) resterait
  // rejouable par RevenueCat sans etre bloque par l'idempotence.
  await enregistrerEvenement();

  return new Response('OK', { status: 200, headers: SECURITY_HEADERS });
});
