import { resetUserStores } from '@/lib/resetSession';
import { useProfilStore } from '@/stores/profilStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useCoursesStore } from '@/stores/coursesStore';
import { useGoutsStore } from '@/stores/goutsStore';
import { usePanierStore } from '@/stores/panierStore';
import { queryClient } from '@/lib/queryClient';

describe('resetUserStores', () => {
  it('appelle reset() sur chaque store utilisateur et vide le cache React Query', () => {
    const resetProfil = jest.spyOn(useProfilStore.getState(), 'reset');
    const resetOnboarding = jest.spyOn(useOnboardingStore.getState(), 'reset');
    const resetCourses = jest.spyOn(useCoursesStore.getState(), 'reset');
    const resetGouts = jest.spyOn(useGoutsStore.getState(), 'reset');
    const resetPanier = jest.spyOn(usePanierStore.getState(), 'reset');
    const clearQueryClient = jest.spyOn(queryClient, 'clear');

    resetUserStores();

    expect(resetProfil).toHaveBeenCalledTimes(1);
    expect(resetOnboarding).toHaveBeenCalledTimes(1);
    expect(resetCourses).toHaveBeenCalledTimes(1);
    expect(resetGouts).toHaveBeenCalledTimes(1);
    expect(resetPanier).toHaveBeenCalledTimes(1);
    // COUR-27 : le planning n'a plus de store local — queryClient.clear()
    // suffit (react-query refetchera pour le nouveau profil_id).
    expect(clearQueryClient).toHaveBeenCalledTimes(1);
  });
});
