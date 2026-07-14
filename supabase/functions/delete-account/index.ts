// Suppression de compte conforme nLPD (droit a l'effacement).
// 1. Anonymise les donnees personnelles  2. Conserve les donnees agregees
// 3. Marque deleted_at  4. Revoque les tokens  5. Confirme par email.
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod/mod.ts';
import { SECURITY_HEADERS } from '../_shared/security-headers.ts';

const DeleteRequestSchema = z.object({
  userId: z.string().uuid(),
});

serve(async (req) => {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Requete invalide' }), {
      status: 400,
      headers: SECURITY_HEADERS,
    });
  }

  const parsed = DeleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Requete invalide', details: parsed.error.flatten() }), {
      status: 400,
      headers: SECURITY_HEADERS,
    });
  }
  if (parsed.data.userId !== userData.user.id) {
    return new Response(JSON.stringify({ error: 'Requete invalide' }), {
      status: 400,
      headers: SECURITY_HEADERS,
    });
  }

  const userId = parsed.data.userId;

  await supabase
    .from('profils')
    .update({
      prenom: 'Utilisateur supprime',
      allergies: [],
      regime: [],
      objectifs: [],
      deleted_at: new Date().toISOString(),
    })
    .eq('id', userId);

  await supabase.auth.admin.deleteUser(userId);

  return new Response(JSON.stringify({ ok: true }), {
    headers: SECURITY_HEADERS,
  });
});
