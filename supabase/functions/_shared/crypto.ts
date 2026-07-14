// Helpers crypto partages entre Edge Functions.
import { timingSafeEqual as denoTimingSafeEqual } from 'https://deno.land/std/crypto/timing_safe_equal.ts';

/**
 * Compare deux chaines en temps constant (evite les timing attacks sur les
 * comparaisons de secrets/tokens, ex. header Authorization d'un webhook).
 * Retourne toujours false si les longueurs different (fuite de longueur
 * acceptable, la comparaison octet-a-octet elle reste en temps constant).
 */
export function comparaisonTempsConstant(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return denoTimingSafeEqual(bufA, bufB);
}
