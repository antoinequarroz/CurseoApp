/**
 * COUR-27 : lit/ecrit le planning depuis `repas_planifies` (COUR-26, une
 * ligne par creneau reel : profil_id/date_repas/moment). Reconstruit la
 * forme `PlanningHebdomadaire` (day-name keyed) deja consommee par
 * `components/planning/PlanningSemaine.tsx` et `lib/generateurCourses.ts`
 * pour ne rien changer a ces deux-la — seule la source de donnees change
 * (Supabase au lieu d'un store Zustand local).
 *
 * Une ligne n'existe que pour un creneau DECIDE (recette assignee OU
 * explicitement ignoree) — "pas encore decide" reste l'absence de ligne,
 * jamais un troisieme etat stocke (meme semantique que le schema COUR-26).
 */
import { supabase } from './supabase';
import { fetchRecettesParIds } from './recettesRepository';
import { dates } from './dates';
import type { PlanningHebdomadaire, Recette } from '@/types';

interface LigneRepasBrute {
  profil_id: string;
  date_repas: string;
  moment: 'midi' | 'soir';
  ignore: boolean;
  recette_id: string | null;
  portions: number | null;
  membre_ids: string[];
}

function planningVide(): PlanningHebdomadaire {
  return { lundi: {}, mardi: {}, mercredi: {}, jeudi: {}, vendredi: {}, samedi: {}, dimanche: {} };
}

/**
 * Toutes les lignes decidees entre `semaineDebut` (lundi) et `semaineDebut`
 * + 6 jours (dimanche), reconstruites en `PlanningHebdomadaire`. Un seul
 * aller-retour pour les recettes (fetchRecettesParIds), pas un par repas.
 */
export async function fetchPlanningSemaine(profilId: string, semaineDebut: Date): Promise<PlanningHebdomadaire> {
  const debutISO = dates.versISO(semaineDebut);
  const finISO = dates.versISO(dates.finSemaine(semaineDebut));

  const { data, error } = await supabase
    .from('repas_planifies')
    .select('profil_id, date_repas, moment, ignore, recette_id, portions, membre_ids')
    .eq('profil_id', profilId)
    .gte('date_repas', debutISO)
    .lte('date_repas', finISO);

  if (error) throw error;
  const lignes = (data ?? []) as LigneRepasBrute[];

  const recetteIds = Array.from(new Set(lignes.map((l) => l.recette_id).filter((id): id is string => Boolean(id))));
  const recettes = await fetchRecettesParIds(recetteIds);
  const recetteParId = new Map(recettes.map((r) => [r.id, r]));

  const planning = planningVide();
  for (const ligne of lignes) {
    const jour = dates.jourSemaineDepuisISO(ligne.date_repas);

    if (ligne.ignore) {
      planning[jour][`${ligne.moment}Ignore`] = true;
      continue;
    }
    const recette = ligne.recette_id ? recetteParId.get(ligne.recette_id) : undefined;
    if (!recette) continue;
    planning[jour][ligne.moment] = {
      recette,
      portions: ligne.portions ?? undefined,
      membreIds: ligne.membre_ids.length > 0 ? ligne.membre_ids : undefined,
    };
  }
  return planning;
}

export interface DonneesAssignation {
  recette: Recette;
  portions?: number;
  membreIds?: string[];
}

/** Assigne une recette a un creneau (upsert : remplace un ignore/une assignation precedente au meme creneau). */
export async function assignerRepas(
  profilId: string,
  dateRepas: string,
  moment: 'midi' | 'soir',
  donnees: DonneesAssignation,
): Promise<void> {
  const { error } = await supabase.from('repas_planifies').upsert(
    {
      profil_id: profilId,
      date_repas: dateRepas,
      moment,
      ignore: false,
      recette_id: donnees.recette.id,
      portions: donnees.portions ?? null,
      membre_ids: donnees.membreIds ?? [],
    },
    { onConflict: 'profil_id,date_repas,moment' },
  );
  if (error) throw error;
}

/** Marque explicitement "rien prevu" pour ce creneau (distinct de l'absence de ligne = "pas encore decide"). */
export async function ignorerRepasDate(profilId: string, dateRepas: string, moment: 'midi' | 'soir'): Promise<void> {
  const { error } = await supabase.from('repas_planifies').upsert(
    { profil_id: profilId, date_repas: dateRepas, moment, ignore: true, recette_id: null, portions: null, membre_ids: [] },
    { onConflict: 'profil_id,date_repas,moment' },
  );
  if (error) throw error;
}

/** Retire completement la decision pour ce creneau (retour a "pas encore decide", ni assigne ni ignore). */
export async function retirerRepasDate(profilId: string, dateRepas: string, moment: 'midi' | 'soir'): Promise<void> {
  const { error } = await supabase
    .from('repas_planifies')
    .delete()
    .eq('profil_id', profilId)
    .eq('date_repas', dateRepas)
    .eq('moment', moment);
  if (error) throw error;
}
