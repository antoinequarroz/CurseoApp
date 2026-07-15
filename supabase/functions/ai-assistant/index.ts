// Proxy OpenAI — la cle API ne doit JAMAIS etre dans le bundle client.
// Reserve aux abonnes Standard+, rate-limite a 20 requetes/heure/utilisateur.
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod/mod.ts';
import { SECURITY_HEADERS, reponsePreflight } from '../_shared/security-headers.ts';

const AssistantRequestSchema = z.object({
  message: z.string().min(1).max(500),
  contexte: z
    .object({
      nb_personnes: z.number().int().min(1).max(20),
      budget: z.number().min(0).max(10000),
      regime: z.array(z.string()).max(10),
      allergies: z.array(z.string()).max(20),
    })
    .optional(),
  historique: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .max(10),
});

const RATE_LIMIT_PAR_HEURE = 20;

serve(async (req) => {
  const preflight = reponsePreflight(req);
  if (preflight) return preflight;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Non authentifie' }), {
      status: 401,
      headers: SECURITY_HEADERS,
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: userData, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (authError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Token invalide' }), {
      status: 401,
      headers: SECURITY_HEADERS,
    });
  }
  const userId = userData.user.id;

  const { data: profil } = await supabase
    .from('profils')
    .select('abonnement')
    .eq('id', userId)
    .single();
  if (!profil || profil.abonnement === 'gratuit') {
    return new Response(JSON.stringify({ error: 'Fonctionnalite reservee aux abonnes Standard+' }), {
      status: 403,
      headers: SECURITY_HEADERS,
    });
  }

  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('requests, window_start')
    .eq('user_id', userId)
    .eq('endpoint', 'ai-assistant')
    .maybeSingle();

  if (existing && existing.window_start > windowStart) {
    if (existing.requests >= RATE_LIMIT_PAR_HEURE) {
      return new Response(JSON.stringify({ error: 'Limite de requetes atteinte, reessaie dans une heure' }), {
        status: 429,
        headers: SECURITY_HEADERS,
      });
    }
    await supabase
      .from('rate_limits')
      .update({ requests: existing.requests + 1 })
      .eq('user_id', userId)
      .eq('endpoint', 'ai-assistant');
  } else {
    await supabase
      .from('rate_limits')
      .upsert({ user_id: userId, endpoint: 'ai-assistant', requests: 1, window_start: new Date().toISOString() });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Requete invalide' }), {
      status: 400,
      headers: SECURITY_HEADERS,
    });
  }
  const parsed = AssistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Requete invalide', details: parsed.error.flatten() }), {
      status: 400,
      headers: SECURITY_HEADERS,
    });
  }

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        ...parsed.data.historique,
        { role: 'user', content: parsed.data.message },
      ],
    }),
  });

  const result = await openaiResponse.json();
  return new Response(JSON.stringify(result), { headers: SECURITY_HEADERS });
});
