/**
 * Tokens de theme Courseo. Tous les composants doivent consommer ces valeurs
 * via useTheme() (contexts/ThemeContext.tsx) plutot que hardcoder des couleurs —
 * c'est le seul moyen de garantir un dark mode coherent sur toute l'app.
 */

export const lightTheme = {
  bg: '#FAFAF7',
  bgSecondary: '#F2F0E8',
  bgCard: '#FFFFFF',
  bgElevated: '#FFFFFF',
  textPrimary: '#1C1C1E',
  textSecondary: '#6B7280',
  textMuted: '#5D6B80',
  primary: '#2D6A4F',
  primaryLight: '#52B788',
  primaryDark: '#1B4332',
  accent: '#E8F5A3',
  accentDark: '#C9E52A',
  border: '#E5E7EB',
  priceColor: '#2D6A4F',
  savingsColor: '#52B788',
  success: '#52B788',
  warning: '#F59E0B',
  error: '#DC2626',
  swipeLike: '#D1FAE5',
  swipePass: '#FEE2E2',
  overlay: 'rgba(0,0,0,0)',
  /** Couleurs dediees aux chips/badges pastel — contraste AA garanti sur leur fond associe (voir Badge.tsx). */
  warningBg: '#FEF3C7',
  chipTextSuccess: '#146641',
  chipTextWarning: '#92400E',
  chipTextError: '#B91C1C',
  chipTextNeutral: '#55606E',
};

export const darkTheme = {
  bg: '#0F1412',
  bgSecondary: '#1A2420',
  bgCard: '#1F2E29',
  bgElevated: '#263530',
  textPrimary: '#F0F7F4',
  textSecondary: '#9DB8AE',
  textMuted: '#82A199',
  primary: '#52B788',
  primaryLight: '#74C69D',
  primaryDark: '#2D6A4F',
  accent: '#C9E52A',
  accentDark: '#C9E52A',
  border: '#2A3D37',
  priceColor: '#74C69D',
  savingsColor: '#74C69D',
  success: '#74C69D',
  warning: '#FCD34D',
  error: '#F87171',
  swipeLike: '#1A3328',
  swipePass: '#2D1515',
  overlay: 'rgba(0,0,0,0.15)',
  /** Couleurs dediees aux chips/badges pastel — contraste AA garanti sur leur fond associe (voir Badge.tsx). */
  warningBg: '#3D2E0A',
  chipTextSuccess: '#74C69D',
  chipTextWarning: '#FCD34D',
  chipTextError: '#F87171',
  chipTextNeutral: '#9DB8AE',
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
