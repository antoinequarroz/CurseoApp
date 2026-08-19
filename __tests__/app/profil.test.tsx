import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemeProvider } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { useAbonnement } from '@/hooks/useAbonnement';
import Profil from '@/app/(tabs)/profil';
import { restaurerAchats } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';
import { resetUserStores } from '@/lib/resetSession';
import { toast } from '@/lib/toast';
import type { Profil as ProfilType } from '@/types';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('@/hooks/useAbonnement');
jest.mock('@/lib/revenuecat', () => ({
  ...jest.requireActual('@/lib/revenuecat'),
  restaurerAchats: jest.fn(),
}));
jest.mock('@/lib/resetSession', () => ({ resetUserStores: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { succes: jest.fn(), erreur: jest.fn() } }));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    functions: { invoke: jest.fn().mockResolvedValue({ error: null }) },
    // COUR-38 : le store profilStore debat (600ms) l'ecriture Supabase des
    // preferences — sans ce stub, une ecriture qui se declenche apres la fin
    // d'un test plante un test SUIVANT (setTimeout non nettoye entre tests).
    from: jest.fn(() => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) })),
  },
}));

const useAbonnementMock = useAbonnement as jest.Mock;

const METRICS_TEST = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function renderAvecProviders() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS_TEST}>
      <ThemeProvider>
        <Profil />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const profilBase: ProfilType = {
  id: 'u-1',
  prenom: 'Alex',
  nb_personnes: 3,
  nb_enfants: 1,
  enfants_ages: [6],
  budget_hebdo: 150,
  regime: [],
  allergies: [],
  objectifs: [],
  enseignes_favorites: [],
  equipements_cuisine: null,
  abonnement: 'standard',
  notifications_activees: true,
  notifications_planning: true,
  notifications_budget: true,
  notifications_promos: false,
  notifications_bilan: true,
  apparence: 'auto',
  cgvu_version_acceptee: null,
};

describe('Profil', () => {
  beforeEach(() => {
    // COUR-38 : reset AVANT chaque test (pas apres) — le composant du test
    // precedent est encore monte au moment d'un afterEach (cleanup RTL
    // s'execute apres les afterEach du describe), donc un reset() en
    // afterEach met a jour un composant deja "termine" hors act(),
    // provoquant des "overlapping act() calls" qui polluent le test suivant.
    useProfilStore.getState().reset();
    useAbonnementMock.mockReturnValue({ niveau: 'standard', estAuMoins: jest.fn(() => false) });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('succes : sans profil charge, affiche les valeurs par defaut', async () => {
    const { getByText } = await renderAvecProviders();
    expect(getByText('Ton foyer')).toBeTruthy();
    expect(getByText('Gratuit')).toBeTruthy();
  });

  it('succes : avec un profil charge, affiche le prenom et le palier actuel', async () => {
    useProfilStore.getState().setProfil(profilBase);
    const { getByText } = await renderAvecProviders();
    expect(getByText('Alex')).toBeTruthy();
    expect(getByText('Standard')).toBeTruthy();
  });

  it('abonnement : ouvrir la section affiche les 4 paliers et le bouton restaurer', async () => {
    useProfilStore.getState().setProfil(profilBase);
    const { getByLabelText, findByText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Abonnement'));
    expect(await findByText('Restaurer mes achats')).toBeTruthy();
    expect(await findByText('Famille')).toBeTruthy();
  });

  it('restauration : succes reflete le nouveau palier et affiche un toast', async () => {
    useProfilStore.getState().setProfil(profilBase);
    (restaurerAchats as jest.Mock).mockResolvedValue('famille');
    const { getByLabelText, findByText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Abonnement'));
    await fireEvent.press(await findByText('Restaurer mes achats'));

    await waitFor(() => expect(toast.succes).toHaveBeenCalledWith('Achats restaurés.'));
    expect(useProfilStore.getState().profil?.abonnement).toBe('famille');
  });

  it('restauration : echec affiche un toast d\'erreur sans planter', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    useProfilStore.getState().setProfil(profilBase);
    (restaurerAchats as jest.Mock).mockRejectedValue(new Error('reseau'));
    const { getByLabelText, findByText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Abonnement'));
    await fireEvent.press(await findByText('Restaurer mes achats'));

    await waitFor(() => expect(toast.erreur).toHaveBeenCalledWith('Impossible de restaurer tes achats. Vérifie ta connexion et réessaie.'));
    expect(warnSpy).toHaveBeenCalledWith('[profil] Echec restauration achats', expect.any(Error));
  });

  it('apparence : selectionner un theme le marque comme selectionne', async () => {
    const { getByLabelText, findByText, getAllByRole } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Apparence'));
    await fireEvent.press(await findByText('Sombre'));

    const radios = getAllByRole('radio');
    const sombre = radios.find((r) => r.props.accessibilityState?.selected);
    expect(sombre).toBeTruthy();
  });

  it('notifications : basculer le switch "Alertes budget" met a jour les preferences', async () => {
    useProfilStore.getState().setProfil(profilBase);
    const { getAllByRole } = await renderAvecProviders();
    // Ordre de rendu (app/(tabs)/profil.tsx) : planning, budget, promos, bilan.
    const switches = getAllByRole('switch');
    await fireEvent(switches[1]!, 'valueChange', false);

    expect(useProfilStore.getState().profil?.notifications_budget).toBe(false);
  });

  it('famille : sans le palier requis, ouvre le paywall au lieu de naviguer', async () => {
    useAbonnementMock.mockReturnValue({ niveau: 'standard', estAuMoins: jest.fn(() => false) });
    const pushSpy = router.push as jest.Mock;
    const { getByLabelText, findByLabelText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Membres du foyer'));
    expect(await findByLabelText('Fermer')).toBeTruthy();
    expect(pushSpy).not.toHaveBeenCalledWith('/membres-foyer');
  });

  it('famille : avec le palier Famille, navigue directement', async () => {
    useAbonnementMock.mockReturnValue({ niveau: 'famille', estAuMoins: jest.fn(() => true) });
    const pushSpy = router.push as jest.Mock;
    const { getByLabelText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Membres du foyer'));
    expect(pushSpy).toHaveBeenCalledWith('/membres-foyer');
  });

  // COUR-38 : un test par carte plutot qu'un seul test avec 4 press
  // consecutifs — presser deux cartes de navigation dans le meme test
  // declenchait un residu d'etat qui polluait le test SUIVANT ("overlapping
  // act() calls" intermittents), non reproduit quand chaque carte est
  // exercee dans son propre test isole.
  it('navigation : la carte Mon foyer ouvre /mon-foyer', async () => {
    const pushSpy = router.push as jest.Mock;
    const { getByLabelText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Mon foyer'));
    expect(pushSpy).toHaveBeenCalledWith('/mon-foyer');
  });

  it('navigation : la carte On cerne vos gouts ouvre /gouts', async () => {
    const pushSpy = router.push as jest.Mock;
    const { getByLabelText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('On cerne vos goûts'));
    expect(pushSpy).toHaveBeenCalledWith('/gouts');
  });

  it('navigation : la carte Adresses de livraison ouvre /adresses', async () => {
    const pushSpy = router.push as jest.Mock;
    const { getByLabelText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Adresses de livraison'));
    expect(pushSpy).toHaveBeenCalledWith('/adresses');
  });

  it('navigation : la carte Equipements de cuisine ouvre /equipements-cuisine', async () => {
    const pushSpy = router.push as jest.Mock;
    const { getByLabelText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Équipements de cuisine'));
    expect(pushSpy).toHaveBeenCalledWith('/equipements-cuisine');
  });

  it('navigation : la carte Aide & support ouvre /aide', async () => {
    const pushSpy = router.push as jest.Mock;
    const { getByLabelText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Aide & support'));
    expect(pushSpy).toHaveBeenCalledWith('/aide');
  });

  it('deconnexion : signOut + reset stores + redirection', async () => {
    const replaceSpy = router.replace as jest.Mock;
    const { getByLabelText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Déconnexion'));
    await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalled());
    expect(resetUserStores).toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledWith('/(auth)/connexion');
  });

  it('suppression de compte : le bouton de confirmation est desactive tant que l\'email est vide', async () => {
    const { getByLabelText, findByLabelText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Supprimer mon compte'));
    const bouton = await findByLabelText('Confirmer la suppression');
    expect(bouton.props.accessibilityState?.disabled).toBe(true);
  });

  it('suppression de compte : succes appelle delete-account puis redirige', async () => {
    const replaceSpy = router.replace as jest.Mock;
    const { getByLabelText, findByLabelText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Supprimer mon compte'));
    await fireEvent.changeText(await findByLabelText('Confirme ton email pour supprimer le compte'), 'alex@coursia.test');
    await fireEvent.press(await findByLabelText('Confirmer la suppression'));

    await waitFor(() =>
      expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-account', { body: { userId: 'u-1' } }),
    );
    expect(resetUserStores).toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledWith('/(auth)/connexion');
  });

  it('suppression de compte : erreur serveur affiche un toast sans deconnecter', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({ error: new Error('echec') });
    const { getByLabelText, findByLabelText } = await renderAvecProviders();
    await fireEvent.press(getByLabelText('Supprimer mon compte'));
    await fireEvent.changeText(await findByLabelText('Confirme ton email pour supprimer le compte'), 'alex@coursia.test');
    await fireEvent.press(await findByLabelText('Confirmer la suppression'));

    await waitFor(() => expect(toast.erreur).toHaveBeenCalledWith('La suppression a échoué, réessaie dans un instant'));
    expect(resetUserStores).not.toHaveBeenCalled();
  });
});
