/** Etat global du profil foyer — preferences, restrictions, abonnement. */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import type { NiveauAbonnement, Profil } from '@/types';

interface ProfilState {
  profil: Profil | null;
  setProfil: (profil: Profil) => void;
  mettreAJourPreferences: (partiel: Partial<Profil>) => void;
  refleterAbonnementLocal: (niveau: NiveauAbonnement) => void;
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
  // COUR-32 : reflete localement le palier renvoye par RevenueCat (achat,
  // restauration, ecouteur CustomerInfo) pour une UI a jour sans
  // redemarrage — n'ecrit JAMAIS vers Supabase (le webhook RevenueCat reste
  // l'unique source de verite persistee, voir ADR-004), sinon un client
  // pourrait ecraser ou devancer incorrectement l'etat serveur.
  refleterAbonnementLocal: (niveau) => {
    const profilActuel = get().profil;
    if (!profilActuel || profilActuel.abonnement === niveau) return;
    set({ profil: { ...profilActuel, abonnement: niveau } });
  },
  reset: () => set({ profil: null }),
}));
