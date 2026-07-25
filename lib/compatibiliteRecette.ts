/**
 * COUR-22/25 : logique de compatibilite recette/contraintes (regime +
 * allergies), factorisee ici pour etre partagee entre le catalogue
 * (hooks/useRecettes.ts, contraintes du profil foyer-entier) et
 * l'assignation d'un repas a des membres precis (hooks/useCompatibiliteMembres.ts,
 * COUR-25). Une seule source de verite pour "cette recette convient-elle a
 * ces contraintes ?", jamais deux implementations qui pourraient diverger.
 */
import type { AllergeneEffectif, Recette, Regime } from '@/types';

export interface AlerteAllergene {
  code: string;
  libelle: string;
}

export interface ResultatCompatibilite {
  recettes: Recette[];
  alertesParRecette: Record<string, AlerteAllergene[]>;
  allergiesNonReconnues: string[];
}

/** Normalise pour une comparaison tolerante (accents, casse, espaces). */
export function normaliserAllergie(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Resout une allergie saisie librement vers un code canonique via le
 * referentiel de synonymes (COUR-15). `synonymes === null` = mode degrade
 * sans Supabase (RECETTES_MOCK) : pas de referentiel disponible, on retombe
 * sur l'ancienne comparaison exacte plutot que de tout marquer "non reconnu".
 * Repli pluriel simple (retrait du 's' final) pour les variantes non
 * explicitement seedees dans synonymes_allergenes.
 */
export function resoudreAllergie(terme: string, synonymes: Map<string, string> | null): string | null {
  const normalise = normaliserAllergie(terme);
  if (synonymes === null) return normalise;
  if (synonymes.has(normalise)) return synonymes.get(normalise) ?? null;
  if (normalise.endsWith('s')) {
    const singulier = normalise.slice(0, -1);
    if (synonymes.has(singulier)) return synonymes.get(singulier) ?? null;
  }
  return null;
}

/** Allergenes effectifs d'une recette, avec repli sur `allergenes` (declares uniquement) pour le catalogue mock qui n'a pas `allergenesEffectifs`. */
function allergenesEffectifsDe(r: Recette): AllergeneEffectif[] {
  return r.allergenesEffectifs ?? r.allergenes.map((code) => ({ code, libelle: code, source: 'declare' as const, certitude: 'confirme' as const }));
}

/**
 * Filtre `source` pour ne garder que les recettes compatibles avec TOUTES
 * les contraintes fournies :
 * - regime : chaque regime requis doit etre tague sur la recette
 *   (intersection stricte — une recette taguee seulement 'vegetarien' ne
 *   convient PAS a quelqu'un qui requiert 'vegetarien' ET 'sans_gluten').
 *   C'est cette semantique (et non un simple "au moins un regime en
 *   commun") qui permet de fusionner correctement les contraintes de
 *   PLUSIEURS membres du foyer sans en trahir aucun (COUR-25).
 * - allergies : une recette avec un allergene EFFECTIF (declare ou deduit
 *   des ingredients) `certitude='confirme'` correspondant a l'une des
 *   allergies est exclue — jamais proposee comme sure. Un match
 *   `certitude='possible'` (deduction ambigue) n'exclut pas mais signale
 *   via `alertesParRecette`. Une allergie que le referentiel ne reconnait
 *   pas est remontee separement (`allergiesNonReconnues`) plutot
 *   qu'ignoree silencieusement.
 */
export function filtrerParContraintes(
  source: Recette[],
  regimesRequis: Regime[],
  allergies: string[],
  synonymes: Map<string, string> | null,
): ResultatCompatibilite {
  const filtreesParRegime = regimesRequis.length
    ? source.filter((r) => regimesRequis.every((reg) => r.regime.includes(reg)))
    : source;

  if (allergies.length === 0) {
    return { recettes: filtreesParRegime, alertesParRecette: {}, allergiesNonReconnues: [] };
  }

  const codesResolus: string[] = [];
  const allergiesNonReconnues: string[] = [];
  for (const terme of allergies) {
    const code = resoudreAllergie(terme, synonymes);
    if (code) codesResolus.push(code);
    else allergiesNonReconnues.push(terme);
  }

  const alertesParRecette: Record<string, AlerteAllergene[]> = {};
  const recettes = filtreesParRegime.filter((r) => {
    const effectifs = allergenesEffectifsDe(r);
    const confirmes = effectifs.some((e) => e.certitude === 'confirme' && codesResolus.includes(e.code));
    if (confirmes) return false;

    const possibles = effectifs.filter((e) => e.certitude === 'possible' && codesResolus.includes(e.code));
    if (possibles.length > 0) {
      alertesParRecette[r.id] = possibles.map((e) => ({ code: e.code, libelle: e.libelle }));
    }
    return true;
  });

  return { recettes, alertesParRecette, allergiesNonReconnues };
}
