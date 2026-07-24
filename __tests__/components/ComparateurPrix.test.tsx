import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComparateurPrix } from '@/components/courses/ComparateurPrix';
import { ThemeProvider } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import * as prixRepository from '@/lib/prixRepository';
import type { ComparatifPrixReel } from '@/lib/prixRepository';
import type { Profil } from '@/types';

jest.mock('@/lib/prixRepository');
jest.mock('@/lib/supabase', () => ({
  ...jest.requireActual('@/lib/supabase'),
  isSupabaseConfigured: true,
}));

const fetchComparatifPrixMock = prixRepository.fetchComparatifPrix as jest.Mock;

function renderAvecProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
}

const profilBase: Profil = {
  id: 'u-1',
  prenom: 'Alex',
  nb_personnes: 1,
  nb_enfants: 0,
  enfants_ages: [] as number[],
  budget_hebdo: 100,
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
};

describe('ComparateurPrix', () => {
  afterEach(() => {
    useProfilStore.getState().reset();
    fetchComparatifPrixMock.mockReset();
  });

  it('affiche le paywall pour un utilisateur gratuit', async () => {
    useProfilStore.getState().setProfil(profilBase);
    const { getByText } = await renderAvecProviders(<ComparateurPrix produit="Pâtes penne 500g" onChoisirPalier={jest.fn()} />);
    expect(getByText('Débloquer le comparateur de prix →')).toBeTruthy();
  });

  it('formats differents : affiche chaque offre avec son format et son prix unitaire propre', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'standard' });
    fetchComparatifPrixMock.mockResolvedValue({
      produitCanoniqueId: 'p-1',
      nom: 'Riz basmati',
      offres: [
        {
          offreId: 'o-1kg', enseigne: 'migros', format: '1kg', quantite: 1, unite: 'kg',
          prix: 4.2, prixUnitaire: 4.2, promotion: null, source: 'saisie_manuelle', collecteLe: new Date().toISOString(),
        },
        {
          offreId: 'o-500g', enseigne: 'migros', format: '500g', quantite: 0.5, unite: 'kg',
          prix: 2.3, prixUnitaire: 4.6, promotion: null, source: 'saisie_manuelle', collecteLe: new Date().toISOString(),
        },
      ],
      meilleurPrixUnitaire: 4.2,
    } satisfies ComparatifPrixReel);

    const { getByText, findByText } = await renderAvecProviders(<ComparateurPrix produit="Riz basmati" onChoisirPalier={jest.fn()} />);
    await findByText('1kg');
    expect(getByText('500g')).toBeTruthy();
    expect(getByText('CHF 4.20')).toBeTruthy();
    expect(getByText('CHF 2.30')).toBeTruthy();
  });

  it('promotion : le badge de promotion est affiche', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'standard' });
    fetchComparatifPrixMock.mockResolvedValue({
      produitCanoniqueId: 'p-1',
      nom: 'Riz basmati',
      offres: [{
        offreId: 'o-1', enseigne: 'migros', format: '1kg', quantite: 1, unite: 'kg',
        prix: 4.2, prixUnitaire: 4.2, promotion: '-7%', source: 'saisie_manuelle', collecteLe: new Date().toISOString(),
      }],
      meilleurPrixUnitaire: 4.2,
    } satisfies ComparatifPrixReel);

    const { findByText } = await renderAvecProviders(<ComparateurPrix produit="Riz basmati" onChoisirPalier={jest.fn()} />);
    expect(await findByText('-7%')).toBeTruthy();
  });

  it('egalite : le badge "meilleur prix" apparait sur toutes les offres ex-aequo', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'standard' });
    fetchComparatifPrixMock.mockResolvedValue({
      produitCanoniqueId: 'p-1',
      nom: 'Riz basmati',
      offres: [
        {
          offreId: 'o-a', enseigne: 'migros', format: '1kg', quantite: 1, unite: 'kg',
          prix: 4.2, prixUnitaire: 4.2, promotion: null, source: 'saisie_manuelle', collecteLe: new Date().toISOString(),
        },
        {
          offreId: 'o-b', enseigne: 'coop', format: '1kg', quantite: 1, unite: 'kg',
          prix: 4.2, prixUnitaire: 4.2, promotion: null, source: 'saisie_manuelle', collecteLe: new Date().toISOString(),
        },
      ],
      meilleurPrixUnitaire: 4.2,
    } satisfies ComparatifPrixReel);

    const { findAllByText } = await renderAvecProviders(<ComparateurPrix produit="Riz basmati" onChoisirPalier={jest.fn()} />);
    const badges = await findAllByText('Meilleur prix');
    expect(badges).toHaveLength(2);
  });

  it('donnees manquantes : produit non trouve affiche un message distinct', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'standard' });
    fetchComparatifPrixMock.mockResolvedValue(null);

    const { findByText } = await renderAvecProviders(<ComparateurPrix produit="Produit inconnu" onChoisirPalier={jest.fn()} />);
    expect(await findByText("Ce produit n'est pas encore suivi par le comparateur.")).toBeTruthy();
  });

  it('donnees manquantes : produit reconnu mais sans prix affiche un message distinct', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'standard' });
    fetchComparatifPrixMock.mockResolvedValue({
      produitCanoniqueId: 'p-1',
      nom: 'Riz basmati',
      offres: [],
      meilleurPrixUnitaire: null,
    } satisfies ComparatifPrixReel);

    const { findByText } = await renderAvecProviders(<ComparateurPrix produit="Riz basmati" onChoisirPalier={jest.fn()} />);
    await waitFor(() => findByText('Aucun prix collecté pour ce produit pour le moment.'));
  });
});
