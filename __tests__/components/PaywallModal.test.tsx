import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PaywallModal } from '@/components/ui/PaywallModal';
import { ThemeProvider } from '@/lib/theme-context';
import { fetchOffreCourante, acheterPackage } from '@/lib/revenuecat';
import { toast } from '@/lib/toast';
import type { PurchasesPackage } from 'react-native-purchases';

jest.mock('@/lib/revenuecat', () => ({
  ...jest.requireActual('@/lib/revenuecat'),
  fetchOffreCourante: jest.fn().mockResolvedValue([]),
  acheterPackage: jest.fn(),
}));
jest.mock('@/lib/toast', () => ({ toast: { succes: jest.fn(), erreur: jest.fn() } }));

const fetchOffreCouranteMock = fetchOffreCourante as jest.Mock;
const acheterPackageMock = acheterPackage as jest.Mock;

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function packageStandard(): PurchasesPackage {
  return { product: { identifier: 'coursia_standard_mensuel', priceString: 'CHF 9.90' } } as PurchasesPackage;
}

describe('PaywallModal', () => {
  beforeEach(() => {
    fetchOffreCouranteMock.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("affiche les 4 paliers d'abonnement", async () => {
    const { getByText } = await renderWithTheme(
      <PaywallModal visible onClose={jest.fn()} onChoisir={jest.fn()} />,
    );
    expect(getByText('Gratuit')).toBeTruthy();
    expect(getByText('Standard')).toBeTruthy();
    expect(getByText('Premium')).toBeTruthy();
    expect(getByText('Famille')).toBeTruthy();
  });

  it('appelle onClose au tap sur le bouton fermer', async () => {
    const onClose = jest.fn();
    const { getByLabelText } = await renderWithTheme(
      <PaywallModal visible onClose={onClose} onChoisir={jest.fn()} />,
    );
    await fireEvent.press(getByLabelText('Fermer'));
    expect(onClose).toHaveBeenCalled();
  });

  it('COUR-35 : explique le palier requis pour une fonctionnalite Famille', async () => {
    const { getByText } = await renderWithTheme(
      <PaywallModal visible onClose={jest.fn()} onChoisir={jest.fn()} featureOrigine="membres_foyer" />,
    );
    expect(getByText('Cette fonctionnalité nécessite le palier Famille.')).toBeTruthy();
  });

  it("COUR-35 : n'affiche aucun palier requis sans featureOrigine connue", async () => {
    const { queryByText } = await renderWithTheme(
      <PaywallModal visible onClose={jest.fn()} onChoisir={jest.fn()} />,
    );
    expect(queryByText(/nécessite le palier/)).toBeNull();
  });

  // COUR-38 : pas d'etat "vide" applicable ici — les 4 paliers sont une
  // liste statique (PALIERS_ABONNEMENT), jamais vide.

  it('chargement : un achat en cours desactive le bouton Continuer', async () => {
    fetchOffreCouranteMock.mockResolvedValue([packageStandard()]);
    let resoudreAchat: (v: { annule: boolean; niveau: null }) => void = () => {};
    acheterPackageMock.mockReturnValue(new Promise((resolve) => { resoudreAchat = resolve; }));
    const { getByText, getByLabelText, findByLabelText } = await renderWithTheme(
      <PaywallModal visible onClose={jest.fn()} onChoisir={jest.fn()} />,
    );
    await findByLabelText(/Choisir le palier Standard/);
    await fireEvent.press(getByText('Continuer'));

    // COUR-38 : pendant l'achat, le bouton perd son texte (ActivityIndicator)
    // — on interroge le Pressable par son accessibilityLabel plutot que par
    // le texte, qui disparait justement pendant le chargement.
    await waitFor(() => expect(getByLabelText('Continuer').props.accessibilityState?.disabled).toBe(true));

    resoudreAchat({ annule: false, niveau: null });
    await waitFor(() => expect(getByLabelText('Continuer').props.accessibilityState?.disabled).toBe(false));
  });

  it("erreur : un achat qui echoue affiche un toast sans planter", async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    fetchOffreCouranteMock.mockResolvedValue([packageStandard()]);
    acheterPackageMock.mockRejectedValue(new Error('reseau'));
    const { getByText, getByLabelText, findByLabelText } = await renderWithTheme(
      <PaywallModal visible onClose={jest.fn()} onChoisir={jest.fn()} />,
    );
    await findByLabelText(/Choisir le palier Standard/);
    await fireEvent.press(getByText('Continuer'));

    await waitFor(() => expect(toast.erreur).toHaveBeenCalledWith("L'achat n'a pas abouti. Réessaie ou vérifie ta connexion."));
    await waitFor(() => expect(getByLabelText('Continuer').props.accessibilityState?.disabled).toBe(false));
    expect(warnSpy).toHaveBeenCalledWith('[paywall] Echec achat', expect.any(Error));
  });
});
