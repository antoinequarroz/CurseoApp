/** Statut d'abonnement courant — source unique de verite pour le gating des features premium. */
import { useMemo } from 'react';
import { useProfilStore } from '@/stores/profilStore';
import type { NiveauAbonnement } from '@/types';

const ORDRE_PALIERS: NiveauAbonnement[] = ['gratuit', 'standard', 'premium', 'famille'];

export function useAbonnement() {
  const abonnement = useProfilStore((s) => s.profil?.abonnement ?? 'gratuit');

  return useMemo(
    () => ({
      niveau: abonnement,
      estAuMoins: (palierRequis: NiveauAbonnement) =>
        ORDRE_PALIERS.indexOf(abonnement) >= ORDRE_PALIERS.indexOf(palierRequis),
    }),
    [abonnement],
  );
}
