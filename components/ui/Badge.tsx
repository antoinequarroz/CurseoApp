import React from 'react';
import { View } from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { Caption } from './Typography';

interface BadgeProps {
  label: string;
  variant?: 'meilleurPrix' | 'success' | 'warning' | 'error' | 'neutral';
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const { colors, isDark } = useTheme();

  // Textes dedies "chipText*" — contraste AA verifie sur leur fond associe (voir lib/theme.ts).
  const styles: Record<NonNullable<BadgeProps['variant']>, { bg: string; text: string }> = {
    // En light, accent est un corail pale -> texte fonce (primaryDark) lisible.
    // En dark, accent devient un brun-corail sombre -> il faut du texte clair
    // (textPrimary), sinon le contraste s'effondre (~1.8:1 avec du texte fonce).
    meilleurPrix: { bg: colors.accent, text: isDark ? colors.textPrimary : colors.primaryDark },
    success: { bg: colors.swipeLike, text: colors.chipTextSuccess },
    warning: { bg: colors.warningBg, text: colors.chipTextWarning },
    error: { bg: colors.swipePass, text: colors.chipTextError },
    neutral: { bg: colors.bgSecondary, text: colors.chipTextNeutral },
  };
  // Garde-fou : une valeur inattendue (ex. recette communautaire mal saisie)
  // ne doit jamais faire crasher tout l'ecran pour un badge decoratif.
  const s = styles[variant] ?? styles.neutral;

  return (
    <View
      style={{
        backgroundColor: s.bg,
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
      }}
      accessibilityRole="text"
    >
      {variant === 'meilleurPrix' && <ArrowDown size={10} color={s.text} />}
      <Caption style={{ color: s.text, textTransform: 'uppercase', fontWeight: '700' }}>{label}</Caption>
    </View>
  );
}
