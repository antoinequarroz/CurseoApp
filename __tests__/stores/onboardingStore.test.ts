import { useOnboardingStore } from '@/stores/onboardingStore';

describe('onboardingStore', () => {
  beforeEach(() => useOnboardingStore.getState().reset());

  it('avance a l\'etape suivante', () => {
    useOnboardingStore.getState().setEtape(3);
    expect(useOnboardingStore.getState().etapeActuelle).toBe(3);
  });

  it('fusionne les donnees partielles sans ecraser les autres champs', () => {
    useOnboardingStore.getState().mettreAJourDonnees({ prenom: 'Alex' });
    useOnboardingStore.getState().mettreAJourDonnees({ budget_hebdo: 200 });
    expect(useOnboardingStore.getState().donneesPartielles).toMatchObject({ prenom: 'Alex', budget_hebdo: 200 });
  });

  it('marque l\'onboarding comme termine', () => {
    useOnboardingStore.getState().terminer();
    expect(useOnboardingStore.getState().estComplete).toBe(true);
  });
});
