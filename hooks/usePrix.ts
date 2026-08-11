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
import { fetchComparatifPrixLive } from '@/lib/swissGroceriesRepository';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSwissGroceriesEligibility } from '@/hooks/useSwissGroceriesEligibility';

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
      expire: false,
    })),
    meilleurPrixUnitaire:
      comparatif.prix.length > 0 ? Math.min(...comparatif.prix.map((p) => p.prix_unitaire)) : null,
  };
}

export function usePrix(nomProduit: string, options: { enabled?: boolean } = {}) {
  const { eligible: swissGroceriesEligible } = useSwissGroceriesEligibility();
  return useQuery({
    queryKey: ['prix', nomProduit, swissGroceriesEligible],
    queryFn: async () => {
      if (!isSupabaseConfigured) return depuisMock(nomProduit);

      const comparatifCatalogue = await fetchComparatifPrix(nomProduit);
      if (comparatifCatalogue?.offres.length || !swissGroceriesEligible) return comparatifCatalogue;

      // Le live reste un fallback : on ne melange jamais, dans un meme
      // comparatif, des observations Supabase et des reponses MCP ephemeres.
      try {
        return (await fetchComparatifPrixLive(nomProduit)) ?? comparatifCatalogue;
      } catch (error) {
        // Un produit déjà connu de Supabase reste consultable même si la
        // source live tombe. Pour un produit totalement inconnu, l'erreur est
        // conservée afin que l'UI n'affiche pas à tort « produit non suivi ».
        if (comparatifCatalogue) return comparatifCatalogue;
        throw error;
      }
    },
    staleTime: 1000 * 60 * 10,
    enabled: options.enabled ?? true,
  });
}
