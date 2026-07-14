// Headers de securite communs a toutes les edge functions.
// Reprend exactement le pattern defini dans ai-assistant/index.ts.
export const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000',
  'Access-Control-Allow-Origin': 'https://courseo.ch',
};
