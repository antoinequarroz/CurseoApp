export const DUREE_SESSION_CHECKOUT_MS = 30 * 60 * 1000;

export interface EtatExpirationCheckout {
  expiree: boolean;
  expireLe: string | null;
  resteMs: number;
}

/** Une date invalide est traitée comme expirée : le checkout ne doit jamais deviner. */
export function evaluerExpirationCheckout(
  creeLe: string,
  maintenant: Date = new Date(),
  dureeMs: number = DUREE_SESSION_CHECKOUT_MS,
): EtatExpirationCheckout {
  const debutMs = Date.parse(creeLe);
  if (!Number.isFinite(debutMs) || dureeMs <= 0) {
    return { expiree: true, expireLe: null, resteMs: 0 };
  }

  const expireMs = debutMs + dureeMs;
  const resteMs = Math.max(0, expireMs - maintenant.getTime());
  return {
    expiree: resteMs === 0,
    expireLe: new Date(expireMs).toISOString(),
    resteMs,
  };
}
