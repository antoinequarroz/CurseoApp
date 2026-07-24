/**
 * COUR-20 : comparateur de prix branche sur Supabase (prix reels,
 * lib/prixRepository.ts) — lib/mocks/prix.mock.ts n'est utilise que si
 * Supabase n'est pas configure du tout (poste de dev sans backend), jamais
 * comme repli silencieux sur une erreur reseau ou un produit non trouve
 * (memes principes que useRecettes, COUR-19).
 */
import { useQuery } from '@tanstack/react-query';
import { trouverPrixProduit } from '@/lib/mocks/prix.mock';
import { fetchComparatifPrix, type ComparatifPrixReel } from '@/lib/prixRepository';
import { isSupabaseConfigured } from '@/lib/supabase';

function depuisMock(nomProduit: string): ComparatifPrixReel | null {
  const comparatif = trouverPrixProduit(nomProduit);
  if (!comparatif) return null;
  return {
    produitCanoniqueId: comparatif.nom,
    nom: comparatif.nom,
    offres: comparatif.prix.map((p) => ({
      offreId: `${comparatif.nom}-${p.enseigne}`,
      enseigne: p.enseigne,
      format: '',
      quantite: 1,
      unite: 'unite',
      prix: p.prix_unitaire,
      prixUnitaire: p.prix_unitaire,
      promotion: p.promotion ?? null,
      source: 'mock',
      collecteLe: new Date().toISOString(),
    })),
    meilleurPrixUnitaire: comparatif.prix.length > 0 ? Math.min(...comparatif.prix.map((p) => p.prix_unitaire)) : null,
  };
}

export function usePrix(nomProduit: string) {
  return useQuery({
    queryKey: ['prix', nomProduit],
    queryFn: () => (isSupabaseConfigured ? fetchComparatifPrix(nomProduit) : Promise.resolve(depuisMock(nomProduit))),
    staleTime: 1000 * 60 * 10,
  });
}
