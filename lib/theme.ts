/**
 * Tokens de theme Coursia — palette "vert foret / sauge / corail / creme"
 * (rebranding, voir moodboard). Tous les composants doivent consommer ces
 * valeurs via useTheme() (lib/theme-context.tsx) plutot que hardcoder des
 * couleurs — c'est le seul moyen de garantir un dark mode coherent sur toute
 * l'app. Contrastes WCOG AA re-verifies pour chaque paire texte/fond utilisee
 * reellement dans l'UI (voir script de verif dans l'historique du projet).
 */

export const lightTheme = {
  bg: '#FAF6EC',
  bgSecondary: '#F0E7D6',
  bgCard: '#FFFFFF',
  bgElevated: '#FFFFFF',
  textPrimary: '#1C1E1B',
  textSecondary: '#5B6B60',
  textMuted: '#55654A',
  primary: '#3E6B52',
  primaryLight: '#7FA087',
  primaryDark: '#1B3A2E',
  accent: '#F3C7A6',
  accentDark: '#DD7C4E',
  border: '#E4DAC4',
  priceColor: '#2F5A44',
  savingsColor: '#3E6B52',
  success: '#3E6B52',
  warning: '#F59E0B',
  error: '#D42020',
  swipeLike: '#DCE9DA',
  swipePass: '#FBE0D2',
  overlay: 'rgba(0,0,0,0)',
  /** Couleurs dediees aux chips/badges pastel — contraste AA garanti sur leur fond associe (voir Badge.tsx). */
  warningBg: '#FEF3C7',
  chipTextSuccess: '#1F4A34',
  chipTextWarning: '#92400E',
  chipTextError: '#B91C1C',
  chipTextNeutral: '#4C5A50',
};

export const darkTheme = {
  bg: '#101E17',
  bgSecondary: '#182A20',
  bgCard: '#1F3428',
  bgElevated: '#274030',
  textPrimary: '#F3EFE2',
  textSecondary: '#A8C2AC',
  textMuted: '#87A38C',
  primary: '#7FA087',
  primaryLight: '#9DBE9F',
  primaryDark: '#3E6B52',
  accent: '#5A4131',
  accentDark: '#EFA173',
  border: '#2C4535',
  priceColor: '#9DBE9F',
  savingsColor: '#9DBE9F',
  success: '#9DBE9F',
  warning: '#FCD34D',
  error: '#F87171',
  swipeLike: '#203526',
  swipePass: '#3A2820',
  overlay: 'rgba(0,0,0,0.15)',
  /** Couleurs dediees aux chips/badges pastel — contraste AA garanti sur leur fond associe (voir Badge.tsx). */
  warningBg: '#3D2E0A',
  chipTextSuccess: '#9DBE9F',
  chipTextWarning: '#FCD34D',
  chipTextError: '#F87171',
  chipTextNeutral: '#A8C2AC',
};

export type Theme = typeof lightTheme;

export const enseigneColors = {
  coop: '#E2001A',
  migros: '#FF6600',
  lidl: '#0050AA',
  aldi: '#00AAE4',
  ottos: '#1C1C1E',
  manor_food: '#6B7280',
} as const;

export const radius = { xs: 6, sm: 10, md: 16, lg: 20, xl: 28, full: 9999 };
export const spacing = { screen: 20, card: 16, gap: 12 };
