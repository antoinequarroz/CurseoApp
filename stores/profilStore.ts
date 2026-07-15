/** Etat global du profil foyer — preferences, restrictions, abonnement. */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import type { Profil } from '@/types';

interface ProfilState {
  profil: Profil | null;
  setProfil: (profil: Profil) => void;
  mettreAJourPreferences: (partiel: Partial<Profil>) => void;
  reset: () => void;
}

// Ecriture Supabase debattue (debounce) et accumulee : mettreAJourPreferences est
// appelee a chaque frappe (champ prenom) ou toggle (notifications) — sans ca, la
// mise a jour ne modifiait que le store local et se perdait au redemarrage.
let pendingUpdate: Partial<Profil> = {};
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useProfilStore = create<ProfilState>((set, get) => ({
  profil: null,
  setProfil: (profil) => set({ profil }),
  mettreAJourPreferences: (partiel) => {
    const profilActuel = get().profil;
    if (!profilActuel) return;
    set({ profil: { ...profilActuel, ...partiel } });

    pendingUpdate = { ...pendingUpdate, ...partiel };
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const aEnvoyer = pendingUpdate;
      pendingUpdate = {};
      void supabase
        .from('profils')
        .update(aEnvoyer)
        .eq('id', profilActuel.id)
        .then(({ error }) => {
          if (error) toast.erreur('Impossible d\'enregistrer tes préférences');
        });
    }, 600);
  },
  reset: () => set({ profil: null }),
}));
