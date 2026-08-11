import { act, renderHook } from '@testing-library/react-native';
import { useAbonnement } from '@/hooks/useAbonnement';
import { useProfilStore } from '@/stores/profilStore';
import type { NiveauAbonnement, Profil } from '@/types';

function profilTest(abonnement: NiveauAbonnement): Profil {
  return {
    id: 'u-1',
    prenom: 'Alex',
    nb_personnes: 1,
    nb_enfants: 0,
    enfants_ages: [],
    budget_hebdo: 150,
    regime: [],
    allergies: [],
    objectifs: [],
    enseignes_favorites: [],
    abonnement,
    notifications_activees: true,
    notifications_planning: true,
    notifications_budget: true,
    notifications_promos: false,
    notifications_bilan: true,
    apparence: 'auto',
    cgvu_version_acceptee: null,
  };
}

const ORDRE: NiveauAbonnement[] = ['gratuit', 'standard', 'premium', 'famille'];

describe('useAbonnement', () => {
  beforeEach(() => useProfilStore.getState().reset());

  // COUR-35 : "des tests couvrent les quatre paliers" — matrice complete
  // palier du profil x palier requis, pas seulement gratuit/premium isoles.
  describe.each(ORDRE)('avec un profil au palier %s', (palierProfil) => {
    beforeEach(() => useProfilStore.getState().setProfil(profilTest(palierProfil)));

    it.each(ORDRE)('estAuMoins(%s) reflete la hierarchie', async (palierRequis) => {
      const { result } = await renderHook(() => useAbonnement());
      const attendu = ORDRE.indexOf(palierProfil) >= ORDRE.indexOf(palierRequis);
      expect(result.current.estAuMoins(palierRequis)).toBe(attendu);
    });
  });

  // COUR-35 : "un abonnement expire" — simule le webhook EXPIRATION
  // (COUR-31/34) qui downgrade vers 'gratuit' pendant la session en cours,
  // sans redemarrage de l'app (refleterAbonnementLocal, meme mecanisme que
  // l'ecouteur CustomerInfo de COUR-32).
  it('un abonnement qui expire en cours de session perd immediatement ses droits', async () => {
    useProfilStore.getState().setProfil(profilTest('famille'));
    const { result, rerender } = await renderHook(() => useAbonnement());
    expect(result.current.estAuMoins('famille')).toBe(true);

    await act(async () => {
      useProfilStore.getState().refleterAbonnementLocal('gratuit');
    });
    await rerender({});

    expect(result.current.niveau).toBe('gratuit');
    expect(result.current.estAuMoins('standard')).toBe(false);
    expect(result.current.estAuMoins('famille')).toBe(false);
  });

  it('retombe sur gratuit sans profil ni palier hors-ligne', async () => {
    const { result } = await renderHook(() => useAbonnement());
    expect(result.current.niveau).toBe('gratuit');
    expect(result.current.estAuMoins('standard')).toBe(false);
  });

  it('utilise le palier hors-ligne (COUR-33) quand aucun profil n\'est charge', async () => {
    useProfilStore.getState().setAbonnementHorsLigne('premium');
    const { result } = await renderHook(() => useAbonnement());
    expect(result.current.niveau).toBe('premium');
    expect(result.current.estAuMoins('standard')).toBe(true);
  });

  it('priorise le profil charge sur le palier hors-ligne', async () => {
    useProfilStore.getState().setAbonnementHorsLigne('famille');
    useProfilStore.getState().setProfil(profilTest('gratuit'));
    const { result } = await renderHook(() => useAbonnement());
    expect(result.current.niveau).toBe('gratuit');
  });
});
