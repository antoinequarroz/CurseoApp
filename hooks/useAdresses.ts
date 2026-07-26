/**
 * COUR-28 : chargement + mutations des adresses de livraison. Meme
 * convention que useMembresFoyer.ts (COUR-24) : fonctions async + refetch(),
 * pas useMutation/invalidateQueries.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdresses, ajouterAdresse, modifierAdresse, retirerAdresse, type DonneesAdresse } from '@/lib/adressesRepository';

export function useAdresses(profilId: string | undefined) {
  const query = useQuery({
    queryKey: ['adresses-livraison', profilId],
    queryFn: () => fetchAdresses(profilId as string),
    enabled: Boolean(profilId),
  });

  const [mutationEnCours, setMutationEnCours] = useState(false);
  const adresses = query.data ?? [];

  const ajouter = async (donnees: DonneesAdresse) => {
    if (!profilId) return;
    setMutationEnCours(true);
    try {
      await ajouterAdresse(profilId, donnees);
      await query.refetch();
    } finally {
      setMutationEnCours(false);
    }
  };

  const modifier = async (adresseId: string, donnees: DonneesAdresse) => {
    if (!profilId) return;
    setMutationEnCours(true);
    try {
      await modifierAdresse(adresseId, profilId, donnees);
      await query.refetch();
    } finally {
      setMutationEnCours(false);
    }
  };

  const retirer = async (adresseId: string) => {
    setMutationEnCours(true);
    try {
      await retirerAdresse(adresseId);
      await query.refetch();
    } finally {
      setMutationEnCours(false);
    }
  };

  return {
    adresses,
    isLoading: query.isLoading,
    isError: query.isError,
    isEmpty: !query.isLoading && !query.isError && adresses.length === 0,
    refetch: query.refetch,
    mutationEnCours,
    ajouter,
    modifier,
    retirer,
  };
}
