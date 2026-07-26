/**
 * COUR-28 : CRUD sur `adresses_livraison` — meme convention que
 * `membresFoyerRepository.ts` (COUR-24) : fonctions exportees simples,
 * `if (error) throw error`, mapper snake_case -> camelCase.
 */
import { supabase } from './supabase';
import type { AdresseLivraison } from '@/types';

interface LigneAdresseBrute {
  id: string;
  libelle: string;
  rue: string;
  npa: string;
  ville: string;
  complement: string | null;
  est_defaut: boolean;
}

const SELECT_ADRESSE = 'id, libelle, rue, npa, ville, complement, est_defaut';

function versAdresse(ligne: LigneAdresseBrute): AdresseLivraison {
  return {
    id: ligne.id,
    libelle: ligne.libelle,
    rue: ligne.rue,
    npa: ligne.npa,
    ville: ligne.ville,
    complement: ligne.complement,
    estDefaut: ligne.est_defaut,
  };
}

export async function fetchAdresses(profilId: string): Promise<AdresseLivraison[]> {
  const { data, error } = await supabase
    .from('adresses_livraison')
    .select(SELECT_ADRESSE)
    .eq('profil_id', profilId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as LigneAdresseBrute[]).map(versAdresse);
}

export interface DonneesAdresse {
  libelle: string;
  rue: string;
  npa: string;
  ville: string;
  complement?: string;
  estDefaut: boolean;
}

/**
 * Retire le flag `est_defaut` des autres adresses du profil avant d'en
 * definir une nouvelle — la contrainte unique partielle
 * (`adresses_livraison_un_seul_defaut`) rejetterait sinon l'ecriture.
 */
async function retirerDefautExistant(profilId: string, exclureAdresseId?: string): Promise<void> {
  let requete = supabase.from('adresses_livraison').update({ est_defaut: false }).eq('profil_id', profilId).eq('est_defaut', true);
  if (exclureAdresseId) requete = requete.neq('id', exclureAdresseId);
  const { error } = await requete;
  if (error) throw error;
}

export async function ajouterAdresse(profilId: string, donnees: DonneesAdresse): Promise<AdresseLivraison> {
  if (donnees.estDefaut) await retirerDefautExistant(profilId);

  const { data, error } = await supabase
    .from('adresses_livraison')
    .insert({
      profil_id: profilId,
      libelle: donnees.libelle,
      rue: donnees.rue,
      npa: donnees.npa,
      ville: donnees.ville,
      complement: donnees.complement ?? null,
      est_defaut: donnees.estDefaut,
    })
    .select(SELECT_ADRESSE)
    .single();

  if (error) throw error;
  return versAdresse(data as LigneAdresseBrute);
}

export async function modifierAdresse(adresseId: string, profilId: string, donnees: DonneesAdresse): Promise<AdresseLivraison> {
  if (donnees.estDefaut) await retirerDefautExistant(profilId, adresseId);

  const { data, error } = await supabase
    .from('adresses_livraison')
    .update({
      libelle: donnees.libelle,
      rue: donnees.rue,
      npa: donnees.npa,
      ville: donnees.ville,
      complement: donnees.complement ?? null,
      est_defaut: donnees.estDefaut,
    })
    .eq('id', adresseId)
    .select(SELECT_ADRESSE)
    .single();

  if (error) throw error;
  return versAdresse(data as LigneAdresseBrute);
}

export async function retirerAdresse(adresseId: string): Promise<void> {
  const { error } = await supabase.from('adresses_livraison').delete().eq('id', adresseId);
  if (error) throw error;
}
