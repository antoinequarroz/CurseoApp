/** Statut d'abonnement courant — source unique de verite pour le gating des features premium. */
import { useMemo } from 'react';
import { useProfilStore } from '@/stores/profilStore';
import type { NiveauAbonnement } from '@/types';

const ORDRE_PALIERS: NiveauAbonnement[] = ['gratuit', 'standard', 'premium', 'famille'];

export function useAbonnement() {
  const abonnementBrut = useProfilStore((s) => s.profil?.abonnement ?? 'gratuit');
  // COUR-31 : droit inconnu (valeur qui ne devrait jamais exister grace a la
  // contrainte CHECK de supabase/schema.sql, mais defense en profondeur cote
  // client) traite explicitement comme 'gratuit' — jamais suppose ni promu a
  // un palier payant par defaut. Voir docs/entitlements/matrice-droits.md.
  const abonnement = ORDRE_PALIERS.includes(abonnementBrut) ? abonnementBrut : 'gratuit';

  return useMemo(
    () => ({
      niveau: abonnement,
      estAuMoins: (palierRequis: NiveauAbonnement) =>
        ORDRE_PALIERS.indexOf(abonnement) >= ORDRE_PALIERS.indexOf(palierRequis),
    }),
    [abonnement],
  );
}
