import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod/mod.ts';
import { SECURITY_HEADERS, reponsePreflight } from '../_shared/security-headers.ts';
import { canAccessSwissGroceries } from './access.mjs';

const RechercheSchema = z.object({
  action: z.literal('search'),
  query: z.string().trim().min(2).max(100),
  chains: z.array(z.enum(['migros', 'coop', 'aldi', 'lidl', 'ottos'])).min(1).max(5),
  limit: z.number().int().min(1).max(10).default(4),
});
const PlanSchema = z.object({
  action: z.literal('plan'),
  items: z.array(z.object({
    query: z.string().trim().min(2).max(100),
    quantity: z.number().int().min(1).max(99),
    filters: z.object({
      tags: z.array(z.enum(['organic', 'premium'])).min(1).max(1),
    }).optional(),
  })).min(1).max(40),
  near: z.object({ zip: z.string().regex(/^\d{4}$/) }),
  chains: z.array(z.enum(['migros', 'coop', 'aldi', 'lidl', 'ottos'])).min(1).max(5),
  strategy: z.enum(['single_store', 'split_cart', 'absolute_cheapest']),
  splitPenaltyChf: z.number().min(0).max(20).default(2),
  radiusKm: z.number().min(1).max(30).default(10),
});
const EligibiliteSchema = z.object({ action: z.literal('eligibility') });
const RequeteSchema = z.discriminatedUnion('action', [EligibiliteSchema, RechercheSchema, PlanSchema]);
const RATE_LIMIT_RECHERCHE_PAR_HEURE = 60;
const RATE_LIMIT_PLAN_PAR_HEURE = 12;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: SECURITY_HEADERS });
}

serve(async (req) => {
  const preflight = reponsePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'Methode non autorisee' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Non authentifie' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: userData, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
  if (authError || !userData.user) return json({ error: 'Token invalide' }, 401);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Requete invalide' }, 400);
  }
  const parsed = RequeteSchema.safeParse(payload);
  if (!parsed.success) return json({ error: 'Requete invalide' }, 400);

  const { data: profil } = await supabase
    .from('profils')
    .select('abonnement')
    .eq('id', userData.user.id)
    .single();
  const accessAllowed = canAccessSwissGroceries({
    mode: Deno.env.get('SWISS_GROCERIES_SERVER_MODE'),
    legacyEnabled: Deno.env.get('SWISS_GROCERIES_SERVER_ENABLED'),
    canaryUserIds: Deno.env.get('SWISS_GROCERIES_CANARY_USER_IDS'),
    userId: userData.user.id,
  });

  if (parsed.data.action === 'eligibility') {
    return json({ eligible: Boolean(profil && profil.abonnement !== 'gratuit' && accessAllowed) });
  }

  if (!profil || profil.abonnement === 'gratuit') {
    return json({ error: 'Fonctionnalite reservee aux abonnes Standard+' }, 403);
  }
  if (!accessAllowed) {
    return json({ error: 'Comparateur live desactive' }, 503);
  }

  const gatewayUrl = Deno.env.get('SWISS_GROCERIES_GATEWAY_URL');
  const gatewayKey = Deno.env.get('SWISS_GROCERIES_GATEWAY_API_KEY');
  if (!gatewayUrl || !gatewayKey) return json({ error: 'Comparateur live non configure' }, 503);

  const endpointLimite = parsed.data.action === 'plan' ? 'swissgroceries-plan' : 'swissgroceries-search';
  const limiteParHeure = parsed.data.action === 'plan' ? RATE_LIMIT_PLAN_PAR_HEURE : RATE_LIMIT_RECHERCHE_PAR_HEURE;
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: limite } = await supabase
    .from('rate_limits')
    .select('requests, window_start')
    .eq('user_id', userData.user.id)
    .eq('endpoint', endpointLimite)
    .maybeSingle();
  if (limite?.window_start > windowStart && limite.requests >= limiteParHeure) {
    return json({ error: 'Limite de recherches atteinte, reessaie dans une heure' }, 429);
  }
  await supabase.from('rate_limits').upsert({
    user_id: userData.user.id,
    endpoint: endpointLimite,
    requests: limite?.window_start > windowStart ? limite.requests + 1 : 1,
    window_start: limite?.window_start > windowStart ? limite.window_start : new Date().toISOString(),
  });

  try {
    const chemin = parsed.data.action === 'plan' ? '/v1/plan-shopping' : '/v1/search-products';
    const requestId = crypto.randomUUID();
    const response = await fetch(`${gatewayUrl.replace(/\/$/, '')}${chemin}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gatewayKey}`,
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(parsed.data.action === 'plan' ? 65_000 : 12_000),
    });
    if (!response.ok) return json({ error: 'Comparateur live indisponible' }, 502);
    const resultat = await response.json();
    return json({
      ...resultat,
      meta: { source: 'SwissGroceries', collectedAt: new Date().toISOString() },
    });
  } catch {
    return json({ error: 'Comparateur live indisponible' }, 502);
  }
});
