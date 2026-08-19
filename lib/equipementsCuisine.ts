import type { EquipementCuisine, Recette } from '@/types';

export const EQUIPEMENTS_CUISINE: EquipementCuisine[] = [
  'plaques_cuisson',
  'four',
  'micro_ondes',
  'air_fryer',
  'mixeur',
  'robot_cuisine',
  'grill',
  'cuiseur_vapeur',
];

/** Repli pour les mocks et les nouvelles recettes non encore balisées. */
export function deduireEquipementsRecette(recette: Pick<Recette, 'etapes'>): EquipementCuisine[] {
  const etapes = recette.etapes.join(' ').toLowerCase();
  const requis: EquipementCuisine[] = [];
  const cuissonPlaques = /(faire revenir|mijoter|saisir|po[eê]le|casserole|nacrer|dorer|griller|fondue)/i.test(etapes)
    || (/(cuire)/i.test(etapes) && !/(au four|r[oô]tir|gratiner)/i.test(etapes));
  if (cuissonPlaques) requis.push('plaques_cuisson');
  if (/(four|r[oô]tir|gratiner)/i.test(etapes)) requis.push('four');
  if (/(mixer|mixeur)/i.test(etapes)) requis.push('mixeur');
  if (/(micro[- ]?ondes?)/i.test(etapes)) requis.push('micro_ondes');
  if (/(air ?fryer|friteuse [àa] air)/i.test(etapes)) requis.push('air_fryer');
  if (/(cuiseur vapeur)/i.test(etapes)) requis.push('cuiseur_vapeur');
  return requis;
}

export function equipementsRequisDe(recette: Recette): EquipementCuisine[] {
  return recette.equipements_requis ?? deduireEquipementsRecette(recette);
}

export function equipementsManquants(
  recette: Recette,
  possedes: EquipementCuisine[] | null | undefined,
): EquipementCuisine[] {
  // Un profil ancien/non renseigné ne doit jamais être interprété comme une
  // cuisine vide : on laisse tout visible jusqu'à une sélection explicite.
  if (possedes == null) return [];
  return equipementsRequisDe(recette).filter((equipement) => !possedes.includes(equipement));
}

export function estCompatibleAvecCuisine(
  recette: Recette,
  possedes: EquipementCuisine[] | null | undefined,
): boolean {
  return equipementsManquants(recette, possedes).length === 0;
}
