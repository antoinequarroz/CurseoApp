// Webhook RevenueCat — a configurer dans le dashboard RevenueCat :
// https://xxx.supabase.co/functions/v1/revenuecat-webhook
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { comparaisonTempsConstant } from '../_shared/crypto.ts';

const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? '';
  // RevenueCat V1 authentifie ses webhooks via un Authorization: Bearer <secret>
  // statique (pas de HMAC de payload) — cf. https://www.revenuecat.com/docs/webhooks
  // On compare donc ce secret en temps constant pour eviter une timing attack.
  if (!WEBHOOK_SECRET || !comparaisonTempsConstant(authHeader, `Bearer ${WEBHOOK_SECRET}`)) {
    return new Response('Non autorise', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { event } = await req.json();
  const userId = event.app_user_id as string;

  const majAbonnement = (niveau: string) =>
    supabase.from('profils').update({ abonnement: niveau }).eq('id', userId);

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
      await majAbonnement(event.entitlement_ids?.[0] ?? 'standard');
      break;
    case 'CANCELLATION':
      // L'acces reste actif jusqu'a la fin de la periode payee — pas de downgrade immediat.
      break;
    case 'EXPIRATION':
      await majAbonnement('gratuit');
      break;
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

  return new Response('OK', { status: 200 });
});
