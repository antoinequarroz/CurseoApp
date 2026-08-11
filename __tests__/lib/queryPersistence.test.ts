import { peutPersisterQuery } from '@/lib/queryPersistence';

describe('queryPersistence', () => {
  it('conserve uniquement les lectures nécessaires au mode hors ligne', () => {
    expect(peutPersisterQuery(['recettes', 'vegetarien'])).toBe(true);
    expect(peutPersisterQuery(['recette', 'r-1'])).toBe(true);
    expect(peutPersisterQuery(['repas-semaine', 'u-1', '2026-08-10'])).toBe(true);
    expect(peutPersisterQuery(['prix', 'tomate'])).toBe(false);
    expect(peutPersisterQuery(['profil', 'u-1'])).toBe(false);
  });
});
