import { supabase } from '@/lib/supabase';
import type { PreferencesCoursesEnLigne } from '@/types';

export const PREFERENCES_COURSES_DEFAUT: PreferencesCoursesEnLigne = {
  substitutionMode: 'automatique_equivalent',
  variationPrixMaxPct: 10,
  marquesPreferees: [],
  marquesRefusees: [],
  livraisonSansContact: false,
  instructionsLivraison: '',
  creneauPrefere: 'indifferent',
  fraisLivraisonMax: 20,
  enseignesAutorisees: [],
};

interface LignePreferences {
  substitution_mode: PreferencesCoursesEnLigne['substitutionMode'];
  variation_prix_max_pct: number;
  marques_preferees: string[];
  marques_refusees: string[];
  livraison_sans_contact: boolean;
  instructions_livraison: string;
  creneau_prefere: PreferencesCoursesEnLigne['creneauPrefere'];
  frais_livraison_max: number;
  enseignes_autorisees: PreferencesCoursesEnLigne['enseignesAutorisees'];
}

const SELECT =
  'substitution_mode, variation_prix_max_pct, marques_preferees, marques_refusees, livraison_sans_contact, instructions_livraison, creneau_prefere, frais_livraison_max, enseignes_autorisees';

function mapper(ligne: LignePreferences): PreferencesCoursesEnLigne {
  return {
    substitutionMode: ligne.substitution_mode,
    variationPrixMaxPct: ligne.variation_prix_max_pct,
    marquesPreferees: ligne.marques_preferees,
    marquesRefusees: ligne.marques_refusees,
    livraisonSansContact: ligne.livraison_sans_contact,
    instructionsLivraison: ligne.instructions_livraison,
    creneauPrefere: ligne.creneau_prefere,
    fraisLivraisonMax: Number(ligne.frais_livraison_max),
    enseignesAutorisees: ligne.enseignes_autorisees,
  };
}

export async function fetchPreferencesCourses(profilId: string): Promise<PreferencesCoursesEnLigne> {
  const { data, error } = await supabase
    .from('preferences_courses_en_ligne')
    .select(SELECT)
    .eq('profil_id', profilId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapper(data as LignePreferences) : PREFERENCES_COURSES_DEFAUT;
}

export async function enregistrerPreferencesCourses(
  profilId: string,
  preferences: PreferencesCoursesEnLigne,
): Promise<PreferencesCoursesEnLigne> {
  const { data, error } = await supabase
    .from('preferences_courses_en_ligne')
    .upsert(
      {
        profil_id: profilId,
        substitution_mode: preferences.substitutionMode,
        variation_prix_max_pct: preferences.variationPrixMaxPct,
        marques_preferees: preferences.marquesPreferees,
        marques_refusees: preferences.marquesRefusees,
        livraison_sans_contact: preferences.livraisonSansContact,
        instructions_livraison: preferences.instructionsLivraison.trim(),
        creneau_prefere: preferences.creneauPrefere,
        frais_livraison_max: preferences.fraisLivraisonMax,
        enseignes_autorisees: preferences.enseignesAutorisees,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profil_id' },
    )
    .select(SELECT)
    .single();
  if (error) throw error;
  return mapper(data as LignePreferences);
}
