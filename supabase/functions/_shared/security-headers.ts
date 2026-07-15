// Headers de securite communs a toutes les edge functions.
// Reprend exactement le pattern defini dans ai-assistant/index.ts.
export const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000',
  'Access-Control-Allow-Origin': 'https://courseo.ch',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

/**
 * Repond aux requetes OPTIONS (preflight CORS) envoyees par un navigateur
 * avant un POST avec des headers custom (Authorization, Content-Type: json).
 * Sans ca, un appel depuis courseo.ch (waitlist) ou un client web (Expo web)
 * echoue au niveau du navigateur avant meme d'atteindre le code de la fonction.
 * A appeler en tout debut de `serve(async (req) => { ... })`.
 */
export function reponsePreflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: SECURITY_HEADERS });
}
