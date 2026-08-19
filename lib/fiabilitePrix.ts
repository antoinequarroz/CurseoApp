export type StatutFraicheurPrix = 'frais' | 'a_verifier' | 'ancien';

export function evaluerFraicheurPrix(
  collecteLe: string,
  maintenant = new Date(),
): {
  statut: StatutFraicheurPrix;
  ageMinutes: number | null;
} {
  const collecte = new Date(collecteLe);
  const ageMs = maintenant.getTime() - collecte.getTime();
  if (!Number.isFinite(collecte.getTime()) || ageMs < 0) return { statut: 'ancien', ageMinutes: null };
  const ageMinutes = Math.floor(ageMs / 60_000);
  if (ageMinutes < 30) return { statut: 'frais', ageMinutes };
  if (ageMinutes < 24 * 60) return { statut: 'a_verifier', ageMinutes };
  return { statut: 'ancien', ageMinutes };
}
