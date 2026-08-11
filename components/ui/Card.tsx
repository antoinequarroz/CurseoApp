/** Card generique CoursIA — coins arrondis uniformes, ombre douce (moodboard v2). */
import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/lib/theme-context';

export function Card({ children, style, ...props }: ViewProps & { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.bgCard,
          borderRadius: 20,
          borderCurve: 'continuous',
          overflow: 'hidden',
          borderWidth: isDark ? 1 : 0,
          borderColor: colors.border,
          boxShadow: isDark ? undefined : '0 6px 24px rgba(15, 45, 39, 0.07)',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
