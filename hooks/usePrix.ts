/** React Query : comparateur de prix (donnees mockees, structure identique a une future API enseignes). */
import { useQuery } from '@tanstack/react-query';
import { trouverPrixProduit } from '@/lib/mocks/prix.mock';

export function usePrix(nomProduit: string) {
  return useQuery({
    queryKey: ['prix', nomProduit],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return trouverPrixProduit(nomProduit) ?? null;
    },
    staleTime: Infinity, // Les prix mockes ne changent pas en session
  });
}
