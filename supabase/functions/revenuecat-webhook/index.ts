// Webhook RevenueCat — a configurer dans le dashboard RevenueCat :
// https://xxx.supabase.co/functions/v1/revenuecat-webhook
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
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
      break;
  }

  return new Response('OK', { status: 200 });
});
