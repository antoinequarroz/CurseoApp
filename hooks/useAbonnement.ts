/** Statut d'abonnement courant — source unique de verite pour le gating des features premium. */
import { useMemo } from 'react';
import { useProfilStore } from '@/stores/profilStore';
import type { NiveauAbonnement } from '@/types';

const ORDRE_PALIERS: NiveauAbonnement[] = ['gratuit', 'standard', 'premium', 'famille'];

export function useAbonnement() {
  // COUR-33 : `profil` est null au demarrage hors-ligne (fetch Supabase
  // impossible, jamais persiste localement — voir lib/abonnementHorsLigne.ts).
  // `abonnementHorsLigne` ne sert alors QUE de repli borne dans le temps
  // (fenetre de grace de 72h), jamais prioritaire sur un `profil` charge.
  const abonnementBrut = useProfilStore((s) => s.profil?.abonnement ?? s.abonnementHorsLigne ?? 'gratuit');
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
