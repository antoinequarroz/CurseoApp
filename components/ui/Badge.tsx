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

  const styles: Record<NonNullable<BadgeProps['variant']>, { bg: string; text: string }> = {
    meilleurPrix: { bg: colors.accent, text: isDark ? '#0F1412' : '#1B4332' },
    success: { bg: colors.swipeLike, text: colors.success },
    warning: { bg: '#FEF3C7', text: colors.warning },
    error: { bg: colors.swipePass, text: colors.error },
    neutral: { bg: colors.bgSecondary, text: colors.textSecondary },
  };
  const s = styles[variant];

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
