import { ProfilSchema, EmailSchema } from '@/lib/validation';

describe('ProfilSchema', () => {
  const base = {
    prenom: 'Alex',
    nb_personnes: 2,
    nb_enfants: 0,
    enfants_ages: [] as number[],
    budget_hebdo: 150,
    regime: [] as const,
    allergies: [] as string[],
    objectifs: [] as const,
    enseignes_favorites: ['migros'] as const,
  };

  it('accepte un profil valide', () => {
    expect(ProfilSchema.safeParse(base).success).toBe(true);
  });

  it('refuse un budget en dessous du minimum', () => {
    const result = ProfilSchema.safeParse({ ...base, budget_hebdo: 5 });
    expect(result.success).toBe(false);
  });

  it('refuse un profil sans enseigne favorite', () => {
    const result = ProfilSchema.safeParse({ ...base, enseignes_favorites: [] });
    expect(result.success).toBe(false);
  });
});

describe('EmailSchema', () => {
  it('valide un email correct', () => {
    expect(EmailSchema.safeParse('test@courseo.ch').success).toBe(true);
  });
  it('refuse un email invalide', () => {
    expect(EmailSchema.safeParse('pas-un-email').success).toBe(false);
  });
});
