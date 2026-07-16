import { useProfilStore } from '@/stores/profilStore';
import type { Profil } from '@/types';

const profilTest: Profil = {
  id: 'u-1',
  prenom: 'Alex',
  nb_personnes: 2,
  nb_enfants: 0,
  enfants_ages: [] as number[],
  budget_hebdo: 150,
  regime: [],
  allergies: [],
  objectifs: [],
  enseignes_favorites: ['migros'],
  abonnement: 'gratuit',
  notifications_activees: true,
  notifications_planning: true,
  notifications_budget: true,
  notifications_promos: false,
  notifications_bilan: true,
  apparence: 'auto',
  cgvu_version_acceptee: null,
};

describe('profilStore', () => {
  beforeEach(() => useProfilStore.getState().reset());

  it('met a jour partiellement les preferences', () => {
    useProfilStore.getState().setProfil(profilTest);
    useProfilStore.getState().mettreAJourPreferences({ budget_hebdo: 200 });
    expect(useProfilStore.getState().profil?.budget_hebdo).toBe(200);
    expect(useProfilStore.getState().profil?.prenom).toBe('Alex');
  });
});
