/** Ecran vide soigne — illustration SVG inline, jamais juste "Aucun résultat". */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/lib/theme-context';
import { Heading, BodySm } from './Typography';
import { Button } from './Button';

type TypeIllustration = 'recettes' | 'planning' | 'courses' | 'economies' | 'favoris' | 'recherche' | 'famille';

interface EmptyStateProps {
  illustration: TypeIllustration;
  titre: string;
  sousTitre?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

function Illustration({ type, color }: { type: TypeIllustration; color: string }) {
  // Formes simples et coherentes — pas d'images externes, evite tout flash de chargement.
  const props = { width: 120, height: 120, viewBox: '0 0 120 120' };
  switch (type) {
    case 'recettes':
      return (
        <Svg {...props}>
          <Circle cx="60" cy="60" r="45" stroke={color} strokeWidth="4" fill="none" />
          <Path d="M40 60 L55 75 L82 45" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'planning':
      return (
        <Svg {...props}>
          <Path d="M20 30 h80 v65 a5 5 0 0 1 -5 5 h-70 a5 5 0 0 1 -5 -5 z" stroke={color} strokeWidth="4" fill="none" />
          <Path d="M20 48 h80 M40 20 v20 M80 20 v20" stroke={color} strokeWidth="4" strokeLinecap="round" />
        </Svg>
      );
    case 'courses':
      return (
        <Svg {...props}>
          <Path d="M30 45 h60 l-6 45 a6 6 0 0 1 -6 5 h-36 a6 6 0 0 1 -6 -5 z" stroke={color} strokeWidth="4" fill="none" />
          <Path d="M42 45 a18 18 0 0 1 36 0" stroke={color} strokeWidth="4" fill="none" />
        </Svg>
      );
    case 'economies':
      return (
        <Svg {...props}>
          <Circle cx="60" cy="65" r="35" stroke={color} strokeWidth="4" fill="none" />
          <Path d="M60 20 c10 0 18 8 18 8" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
          <Path d="M50 60 h20 M60 52 v22" stroke={color} strokeWidth="4" strokeLinecap="round" />
        </Svg>
      );
    case 'favoris':
      return (
        <Svg {...props}>
          <Path
            d="M60 90 C20 65 15 40 35 30 C48 24 58 33 60 40 C62 33 72 24 85 30 C105 40 100 65 60 90 Z"
            stroke={color}
            strokeWidth="4"
            fill="none"
          />
        </Svg>
      );
    case 'recherche':
      return (
        <Svg {...props}>
          <Circle cx="52" cy="52" r="28" stroke={color} strokeWidth="4" fill="none" />
          <Path d="M72 72 L92 92" stroke={color} strokeWidth="5" strokeLinecap="round" />
        </Svg>
      );
    case 'famille':
      return (
        <Svg {...props}>
          <Circle cx="45" cy="42" r="15" stroke={color} strokeWidth="4" fill="none" />
          <Path d="M20 95 a25 25 0 0 1 50 0" stroke={color} strokeWidth="4" fill="none" />
          <Circle cx="82" cy="50" r="11" stroke={color} strokeWidth="4" fill="none" />
          <Path d="M64 95 a18 18 0 0 1 36 0" stroke={color} strokeWidth="4" fill="none" />
        </Svg>
      );
  }
}

export function EmptyState({ illustration, titre, sousTitre, ctaLabel, onCta }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
      <Illustration type={illustration} color={colors.primaryLight} />
      <Heading style={{ textAlign: 'center' }}>{titre}</Heading>
      {sousTitre ? (
        <BodySm style={{ textAlign: 'center', maxWidth: 260 }} numberOfLines={2}>
          {sousTitre}
        </BodySm>
      ) : null}
      {ctaLabel && onCta ? <Button label={ctaLabel} onPress={onCta} /> : null}
    </View>
  );
}
