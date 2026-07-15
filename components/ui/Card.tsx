/**
 * Card generique Coursia — signature visuelle "l'etiquette de marche" :
 * le coin superieur gauche est decoupe en diagonale via un triangle SVG
 * qui recouvre le coin, evoquant une etiquette de marche sans etre litteral.
 */
import React from 'react';
import { View, type ViewProps } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { useTheme } from '@/lib/theme-context';

const CUT_SIZE = 18;

export function Card({ children, style, ...props }: ViewProps & { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.bgCard,
          borderRadius: 16,
          borderTopLeftRadius: 0,
          overflow: 'hidden',
          borderWidth: isDark ? 1 : 0,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0 : 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 2 },
        },
        style,
      ]}
      {...props}
    >
      {/* Triangle qui matérialise le coin découpé, teinté avec le fond de l'écran */}
      <Svg width={CUT_SIZE} height={CUT_SIZE} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <Polygon points={`0,0 ${CUT_SIZE},0 0,${CUT_SIZE}`} fill={colors.bg} />
      </Svg>
      {children}
    </View>
  );
}
