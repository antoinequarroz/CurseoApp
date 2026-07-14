// Inscription a la liste d'attente pre-lancement (landing page courseo.ch).
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod/mod.ts';
import { SECURITY_HEADERS } from '../_shared/security-headers.ts';

const WaitlistSchema = z.object({
  email: z.string().email(),
  source: z.string().max(50).optional(),
  honeypot: z.string().max(0).optional(), // Champ invisible cote landing — anti-spam
});

serve(async (req) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Requete invalide' }), {
      status: 400,
      headers: SECURITY_HEADERS,
    });
  }

  const parsed = WaitlistSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Requete invalide', details: parsed.error.flatten() }), {
      status: 400,
      headers: SECURITY_HEADERS,
    });
  }
  if (parsed.data.honeypot) {
    return new Response(JSON.stringify({ ok: true }), { headers: SECURITY_HEADERS }); // Silencieux pour les bots
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error } = await supabase
    .from('waitlist')
    .insert({ email: parsed.data.email, source: parsed.data.source ?? 'landing' });

  if (error && error.code !== '23505') {
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: SECURITY_HEADERS,
  });
});
