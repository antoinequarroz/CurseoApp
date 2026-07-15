/** Card recette — image, badges difficulté/temps, prix. */
import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/lib/theme-context';
import { useResponsive } from '@/hooks/useResponsive';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TitreRecetteCard, DescriptionRecetteCard, Caption, Price } from '@/components/ui/Typography';
import { formatPrix, formatTemps } from '@/lib/format';
import type { Recette } from '@/types';

const COULEUR_DIFFICULTE: Record<Recette['difficulte'], 'success' | 'warning' | 'error'> = {
  facile: 'success',
  moyen: 'warning',
  difficile: 'error',
};

export function RecetteCard({ recette, variant = 'default' }: { recette: Recette; variant?: 'default' | 'hero' }) {
  const { colors, isDark } = useTheme();
  const { isSmall } = useResponsive();
  const imageHeight = variant === 'hero' ? (isSmall ? 220 : 260) : isSmall ? 180 : 200;

  return (
    <Card style={variant === 'hero' ? { borderRadius: 28, borderTopLeftRadius: 28 } : undefined}>
      <View style={{ height: imageHeight, backgroundColor: colors.bgSecondary }}>
        <Image
          source={{ uri: `${recette.image_url}?auto=format&fit=crop&w=1000&q=80` }}
          placeholder={recette.blurhash}
          contentFit="cover"
          transition={120}
          cachePolicy="memory-disk"
          style={{ width: '100%', height: '100%' }}
          accessibilityLabel={`Photo de ${recette.titre}`}
        />
        <View style={{ position: 'absolute', inset: 0, backgroundColor: isDark ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.16)' }} />
        <View style={{ position: 'absolute', bottom: 12, left: 12 }}>
          <Badge label={recette.difficulte} variant={COULEUR_DIFFICULTE[recette.difficulte] ?? 'neutral'} />
        </View>
        <View style={{ position: 'absolute', bottom: 12, right: 12 }}>
          <Badge label={formatTemps(recette.temps_preparation)} variant="neutral" />
        </View>
      </View>
      <View style={{ padding: variant === 'hero' ? 20 : 16, gap: 8 }}>
        <TitreRecetteCard>{recette.titre}</TitreRecetteCard>
        <DescriptionRecetteCard>{recette.description}</DescriptionRecetteCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <Price>{formatPrix(recette.cout_estime)}</Price>
          <Caption>{recette.portions} portions</Caption>
        </View>
      </View>
    </Card>
  );
}
