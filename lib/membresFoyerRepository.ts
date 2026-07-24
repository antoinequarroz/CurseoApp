/**
 * COUR-24 : premier repository du projet a faire de la vraie ecriture
 * (insert/update/delete), pas seulement de la lecture — les repositories
 * precedents (prixRepository, allergenesRepository, recettesRepository)
 * sont tous lecture seule. S'appuie sur le schema `foyers`/`membres_foyer`
 * (COUR-23) et sa RLS (isolation par foyer_id, jamais par profil_id seul).
 *
 * Ne gere QUE les membres AUTRES que le responsable du foyer
 * (`est_responsable = false`) : le responsable configure ses propres
 * regime/allergies via `Profil` (ecran Profil existant), pas via cet ecran.
 */
import { supabase } from './supabase';
import type { MembreFoyer, Regime } from '@/types';

interface LigneMembreBrute {
  id: string;
  prenom: string;
  age: number | null;
  regime: string[] | null;
  allergies: string[] | null;
}

function versMembre(ligne: LigneMembreBrute): MembreFoyer {
  return {
    id: ligne.id,
    prenom: ligne.prenom,
    age: ligne.age,
    regime: (ligne.regime ?? []) as Regime[],
    allergies: ligne.allergies ?? [],
  };
}

/**
 * Id du foyer de l'utilisateur courant (RLS : `responsable_id = auth.uid()`
 * ne laisse voir que celui-la). Cree a la volee si absent — un foyer n'est
 * aujourd'hui cree par aucun trigger de signup (voir COUR-23), donc la
 * premiere visite de cet ecran est le point de creation naturel.
 */
export async function fetchOuCreerFoyerId(): Promise<string> {
  const { data: existant, error: erreurLecture } = await supabase.from('foyers').select('id').maybeSingle();
  if (erreurLecture) throw erreurLecture;
  if (existant) return existant.id;

  const { data: session } = await supabase.auth.getSession();
  const responsableId = session.session?.user.id;
  if (!responsableId) throw new Error('Utilisateur non authentifie');

  const { data: cree, error: erreurCreation } = await supabase
    .from('foyers')
    .insert({ responsable_id: responsableId })
    .select('id')
    .single();
  if (erreurCreation) throw erreurCreation;
  return cree.id;
}

export async function fetchMembresFoyer(foyerId: string): Promise<MembreFoyer[]> {
  const { data, error } = await supabase
    .from('membres_foyer')
    .select('id, prenom, age, regime, allergies')
    .eq('foyer_id', foyerId)
    .eq('est_responsable', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as LigneMembreBrute[]).map(versMembre);
}

export interface DonneesMembre {
  prenom: string;
  age: number | null;
  regime: Regime[];
  allergies: string[];
}

export async function ajouterMembre(foyerId: string, donnees: DonneesMembre): Promise<MembreFoyer> {
  const { data, error } = await supabase
    .from('membres_foyer')
    .insert({ foyer_id: foyerId, prenom: donnees.prenom, age: donnees.age, regime: donnees.regime, allergies: donnees.allergies })
    .select('id, prenom, age, regime, allergies')
    .single();

  if (error) throw error;
  return versMembre(data as LigneMembreBrute);
}

export async function modifierMembre(membreId: string, donnees: DonneesMembre): Promise<MembreFoyer> {
  const { data, error } = await supabase
    .from('membres_foyer')
    .update({ prenom: donnees.prenom, age: donnees.age, regime: donnees.regime, allergies: donnees.allergies })
    .eq('id', membreId)
    .select('id, prenom, age, regime, allergies')
    .single();

  if (error) throw error;
  return versMembre(data as LigneMembreBrute);
}

export async function retirerMembre(membreId: string): Promise<void> {
  const { error } = await supabase.from('membres_foyer').delete().eq('id', membreId);
  if (error) throw error;
}
