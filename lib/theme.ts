/**
 * Tokens de theme Coursia — palette moodboard v2 "vert foret / sauge / corail /
 * creme". Tous les composants doivent consommer ces valeurs via useTheme()
 * (lib/theme-context.tsx) plutot que hardcoder des couleurs — c'est le seul
 * moyen de garantir un dark mode coherent sur toute l'app.
 *
 * Usage voulu par le moodboard (legende palette) :
 *   #0F2D27 (vert foret)  -> couleur principale, titres, icones actives
 *   #A6C1B1 (sauge)       -> elements secondaires, accents doux
 *   #E7EFE9 (sauge clair) -> fonds, surfaces, etats neutres
 *   #FF7A59 (corail)      -> actions principales, CTA, elements importants
 *   #FFF5E8 (creme)       -> fonds chauds, zones de reassurance
 *   #FFFFFF               -> fonds de base, lisibilite
 *
 * Le corail vif (#FF7A59) n'offre que ~2.6:1 avec du texte blanc — insuffisant
 * pour un bouton (AA exige 4.5:1). `accentDark` (#CC4728, ~4.67:1 avec blanc)
 * est donc la couleur reellement utilisee pour les CTA pleins (Button, pastille
 * active de la nav, bouton "j'aime" du swipe) ; `accent` reste le corail vif du
 * moodboard, utilise en fond pastel avec du texte fonce (Badge, teaser palier).
 * Contrastes verifies via calcul manuel de luminance relative (WCAG 2.1).
 */

export const lightTheme = {
  bg: '#FFFFFF',
  bgSecondary: '#E7EFE9',
  bgCard: '#FFFFFF',
  bgElevated: '#FFFFFF',
  /** Fond chaud "zone de reassurance" du moodboard — hero cards, sections d'accueil. */
  bgWarm: '#FFF5E8',
  textPrimary: '#0F2D27',
  textSecondary: '#4B5D54',
  textMuted: '#5F756A',
  primary: '#0F2D27',
  primaryLight: '#A6C1B1',
  primaryDark: '#081712',
  accent: '#FF7A59',
  accentDark: '#CC4728',
  border: '#DCE6DF',
  priceColor: '#0F2D27',
  savingsColor: '#CC4728',
  success: '#3E6B52',
  warning: '#F59E0B',
  error: '#D42020',
  swipeLike: '#DCEAE0',
  swipePass: '#FDE1D6',
  overlay: 'rgba(0,0,0,0)',
  /** Couleurs dediees aux chips/badges pastel — contraste AA garanti sur leur fond associe (voir Badge.tsx). */
  warningBg: '#FEF3C7',
  chipTextSuccess: '#0F2D27',
  chipTextWarning: '#92400E',
  chipTextError: '#B91C1C',
  chipTextNeutral: '#3F4D45',
};

export const darkTheme = {
  bg: '#0B1613',
  bgSecondary: '#132420',
  bgCard: '#172B25',
  bgElevated: '#1E362E',
  bgWarm: '#241C16',
  textPrimary: '#F3F7F4',
  textSecondary: '#B9CAC0',
  textMuted: '#8CA69A',
  primary: '#A6C1B1',
  primaryLight: '#C9DCD0',
  primaryDark: '#0F2D27',
  accent: '#4A2E22',
  accentDark: '#CC4728',
  border: '#20372E',
  priceColor: '#C9DCD0',
  savingsColor: '#F2977A',
  success: '#9DBE9F',
  warning: '#FCD34D',
  error: '#F87171',
  swipeLike: '#1C3129',
  swipePass: '#3A2016',
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
