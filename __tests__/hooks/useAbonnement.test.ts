import { renderHook } from '@testing-library/react-native';
import { useAbonnement } from '@/hooks/useAbonnement';
import { useProfilStore } from '@/stores/profilStore';

describe('useAbonnement', () => {
  beforeEach(() => useProfilStore.getState().reset());

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
    useProfilStore.getState().setProfil({
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
      abonnement: 'gratuit',
      notifications_activees: true,
      notifications_planning: true,
      notifications_budget: true,
      notifications_promos: false,
      notifications_bilan: true,
      apparence: 'auto',
      cgvu_version_acceptee: null,
    });
    const { result } = await renderHook(() => useAbonnement());
    expect(result.current.niveau).toBe('gratuit');
  });
});
