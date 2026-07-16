/** Formatage suisse officiel — a utiliser partout, jamais de toFixed() inline dans les composants. */

export const formatPrix = (n: number) => `CHF ${n.toFixed(2)}`;
export const formatEconomies = (n: number) => `- CHF ${n.toFixed(2)}`;
export const formatCalories = (n: number) => `${n} kcal`;

export const formatTemps = (min: number): string => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
};

export const formatQuantite = (v: number, u: string): string => {
  if (u === 'g' && v >= 1000) return `${(v / 1000).toFixed(1)} kg`;
  if (u === 'ml' && v >= 1000) return `${(v / 1000).toFixed(1)} L`;
  return `${v} ${u}`;
};
