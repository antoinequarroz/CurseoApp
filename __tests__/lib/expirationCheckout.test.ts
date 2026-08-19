import { DUREE_SESSION_CHECKOUT_MS, evaluerExpirationCheckout } from '@/lib/expirationCheckout';

describe('expirationCheckout', () => {
  const debut = '2026-08-19T12:00:00.000Z';

  it('conserve une session récente', () => {
    expect(evaluerExpirationCheckout(debut, new Date('2026-08-19T12:29:59.999Z'))).toEqual({
      expiree: false,
      expireLe: '2026-08-19T12:30:00.000Z',
      resteMs: 1,
    });
  });

  it('expire exactement après trente minutes', () => {
    expect(
      evaluerExpirationCheckout(debut, new Date('2026-08-19T12:30:00.000Z')).expiree,
    ).toBe(true);
    expect(DUREE_SESSION_CHECKOUT_MS).toBe(1_800_000);
  });

  it('ferme la validation quand la date est invalide', () => {
    expect(evaluerExpirationCheckout('date-invalide').expiree).toBe(true);
  });
});
