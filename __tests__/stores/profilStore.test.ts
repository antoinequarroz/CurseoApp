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

  it('reflete localement un nouveau palier RevenueCat sans toucher le reste du profil', () => {
    useProfilStore.getState().setProfil(profilTest);
    useProfilStore.getState().refleterAbonnementLocal('premium');
    expect(useProfilStore.getState().profil?.abonnement).toBe('premium');
    expect(useProfilStore.getState().profil?.prenom).toBe('Alex');
  });

  it('ignore refleterAbonnementLocal si aucun profil n\'est charge (COUR-33 : hors-ligne au demarrage)', () => {
    useProfilStore.getState().refleterAbonnementLocal('famille');
    expect(useProfilStore.getState().profil).toBeNull();
  });

  it('memorise le palier hors-ligne separement du profil', () => {
    useProfilStore.getState().setAbonnementHorsLigne('standard');
    expect(useProfilStore.getState().abonnementHorsLigne).toBe('standard');
    expect(useProfilStore.getState().profil).toBeNull();
  });

  it('reset efface aussi le palier hors-ligne', () => {
    useProfilStore.getState().setAbonnementHorsLigne('famille');
    useProfilStore.getState().reset();
    expect(useProfilStore.getState().abonnementHorsLigne).toBeNull();
  });
});
