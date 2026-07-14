import { formatPrix, formatEconomies, formatCalories, formatTemps, formatQuantite } from '@/lib/format';

describe('format', () => {
  it('formatPrix ajoute le prefixe CHF avec 2 decimales', () => {
    expect(formatPrix(12.5)).toBe('CHF 12.50');
  });
  it('formatEconomies prefixe avec un signe moins', () => {
    expect(formatEconomies(3.2)).toBe('- CHF 3.20');
  });
  it('formatCalories suffixe kcal', () => {
    expect(formatCalories(450)).toBe('450 kcal');
  });
  it('formatTemps affiche les minutes sous 60', () => {
    expect(formatTemps(45)).toBe('45 min');
  });
  it('formatTemps affiche heures et minutes au-dela de 60', () => {
    expect(formatTemps(90)).toBe('1h30');
    expect(formatTemps(120)).toBe('2h');
  });
  it('formatQuantite convertit g en kg au-dela de 1000', () => {
    expect(formatQuantite(1500, 'g')).toBe('1.5kg');
    expect(formatQuantite(500, 'g')).toBe('500g');
  });
});
