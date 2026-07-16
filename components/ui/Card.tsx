/** Card generique Coursia — coins arrondis uniformes, ombre douce (moodboard v2). */
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
          overflow: 'hidden',
          borderWidth: isDark ? 1 : 0,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0 : 0.06,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
