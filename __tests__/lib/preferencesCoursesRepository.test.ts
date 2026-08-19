import {
  PREFERENCES_COURSES_DEFAUT,
  enregistrerPreferencesCourses,
  fetchPreferencesCourses,
} from '@/lib/preferencesCoursesRepository';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

const mockFrom = supabase.from as jest.Mock;

describe('preferencesCoursesRepository', () => {
  beforeEach(() => mockFrom.mockReset());

  it('utilise des préférences prudentes lorsqu aucune ligne n existe', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    mockFrom.mockReturnValue({ select: jest.fn(() => ({ eq })) });

    await expect(fetchPreferencesCourses('profil-1')).resolves.toEqual(PREFERENCES_COURSES_DEFAUT);
    expect(eq).toHaveBeenCalledWith('profil_id', 'profil-1');
  });

  it('enregistre les substitutions séparément du profil alimentaire', async () => {
    const ligne = {
      substitution_mode: 'automatique_equivalent',
      variation_prix_max_pct: 5,
      marques_preferees: ['Bio'],
      marques_refusees: ['Marque X'],
      livraison_sans_contact: true,
      instructions_livraison: 'Devant la porte',
      creneau_prefere: 'soir',
      frais_livraison_max: 10,
      enseignes_autorisees: ['coop'],
    };
    const single = jest.fn().mockResolvedValue({ data: ligne, error: null });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    mockFrom.mockReturnValue({ upsert });

    const resultat = await enregistrerPreferencesCourses('profil-1', {
      substitutionMode: 'automatique_equivalent',
      variationPrixMaxPct: 5,
      marquesPreferees: ['Bio'],
      marquesRefusees: ['Marque X'],
      livraisonSansContact: true,
      instructionsLivraison: '  Devant la porte  ',
      creneauPrefere: 'soir',
      fraisLivraisonMax: 10,
      enseignesAutorisees: ['coop'],
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ profil_id: 'profil-1', instructions_livraison: 'Devant la porte' }),
      { onConflict: 'profil_id' },
    );
    expect(resultat).toMatchObject({
      substitutionMode: 'automatique_equivalent',
      enseignesAutorisees: ['coop'],
    });
  });
});
