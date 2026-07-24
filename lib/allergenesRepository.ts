/**
 * COUR-22 : referentiel de synonymes d'allergenes (COUR-15,
 * `synonymes_allergenes`), pour resoudre cote client une allergie saisie
 * librement par l'utilisateur (ex. "cacahuète", "noix de cajou") vers un
 * code canonique (`arachide`, `fruits_a_coque`, ...). Recupere en une seule
 * requete plutot que d'appeler `fn_resoudre_allergene` par terme via RPC :
 * la table est petite (referentiel, ~90 lignes) et ne change quasiment
 * jamais, donc un fetch unique + resolution locale est largement suffisant
 * et evite un aller-retour reseau par allergie du profil.
 */
import { supabase } from './supabase';

export interface SynonymeAllergene {
  terme: string;
  code: string;
}

export async function fetchSynonymesAllergenes(): Promise<SynonymeAllergene[]> {
  const { data, error } = await supabase
    .from('synonymes_allergenes')
    .select('terme, allergenes ( code )');

  if (error) throw error;

  return ((data ?? []) as unknown as { terme: string; allergenes: { code: string } | null }[])
    .map((ligne) => ({ terme: ligne.terme, code: ligne.allergenes?.code ?? '' }))
    .filter((s): s is SynonymeAllergene => Boolean(s.code));
}
