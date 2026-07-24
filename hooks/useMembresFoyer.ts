/**
 * COUR-24 : chargement + mutations (ajout/modification/retrait) des membres
 * du foyer. Le catalogue est minuscule par foyer (quelques membres) : pas
 * d'infra de mutation/cache optimiste react-query, un simple refetch()
 * complet apres chaque ecriture suffit et reste simple a suivre.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchOuCreerFoyerId,
  fetchMembresFoyer,
  ajouterMembre,
  modifierMembre,
  retirerMembre,
  type DonneesMembre,
} from '@/lib/membresFoyerRepository';

/**
 * Nombre maximum de membres geres pour le palier Famille. Aucune valeur
 * n'est donnee par le ticket COUR-24 — choix par defaut raisonnable pour un
 * foyer, a ajuster librement (aucune contrainte DB associee, uniquement
 * cette limite cote app).
 */
export const LIMITE_MEMBRES_FAMILLE = 6;

export function useMembresFoyer() {
  const foyerQuery = useQuery({
    queryKey: ['foyer-id'],
    queryFn: fetchOuCreerFoyerId,
    staleTime: Infinity,
  });

  const membresQuery = useQuery({
    queryKey: ['membres-foyer', foyerQuery.data],
    queryFn: () => fetchMembresFoyer(foyerQuery.data as string),
    enabled: Boolean(foyerQuery.data),
  });

  const [mutationEnCours, setMutationEnCours] = useState(false);

  const isLoading = foyerQuery.isLoading || membresQuery.isLoading;
  const isError = foyerQuery.isError || membresQuery.isError;
  const membres = membresQuery.data ?? [];

  const ajouter = async (donnees: DonneesMembre) => {
    if (!foyerQuery.data) throw new Error('Foyer non initialise');
    setMutationEnCours(true);
    try {
      await ajouterMembre(foyerQuery.data, donnees);
      await membresQuery.refetch();
    } finally {
      setMutationEnCours(false);
    }
  };

  const modifier = async (membreId: string, donnees: DonneesMembre) => {
    setMutationEnCours(true);
    try {
      await modifierMembre(membreId, donnees);
      await membresQuery.refetch();
    } finally {
      setMutationEnCours(false);
    }
  };

  const retirer = async (membreId: string) => {
    setMutationEnCours(true);
    try {
      await retirerMembre(membreId);
      await membresQuery.refetch();
    } finally {
      setMutationEnCours(false);
    }
  };

  return {
    membres,
    isLoading,
    isError,
    isEmpty: !isLoading && !isError && membres.length === 0,
    refetch: () => {
      void foyerQuery.refetch();
      void membresQuery.refetch();
    },
    limite: LIMITE_MEMBRES_FAMILLE,
    limiteAtteinte: membres.length >= LIMITE_MEMBRES_FAMILLE,
    mutationEnCours,
    ajouter,
    modifier,
    retirer,
  };
}
