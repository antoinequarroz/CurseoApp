/** Card recette (utilisee dans le swipe et les listes) — image, badges difficulte/temps, prix. */
import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/lib/theme-context';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Heading, BodySm, Price } from '@/components/ui/Typography';
import { formatPrix, formatTemps } from '@/lib/format';
import type { Recette } from '@/types';

const COULEUR_DIFFICULTE: Record<Recette['difficulte'], 'success' | 'warning' | 'error'> = {
  facile: 'success',
  moyen: 'warning',
  difficile: 'error',
};

export function RecetteCard({ recette }: { recette: Recette }) {
  const { isDark } = useTheme();

  return (
    <Card>
      <View style={{ height: 200 }}>
        <Image
          source={{ uri: recette.image_url }}
          placeholder={recette.blurhash}
          contentFit="cover"
          transition={200}
          style={{ width: '100%', height: '100%' }}
          accessibilityLabel={`Photo de ${recette.titre}`}
        />
        {isDark && (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.15)' }} />
        )}
        <View style={{ position: 'absolute', bottom: 8, left: 8 }}>
          <Badge label={recette.difficulte} variant={COULEUR_DIFFICULTE[recette.difficulte]} />
        </View>
        <View style={{ position: 'absolute', bottom: 8, right: 8 }}>
          <Badge label={formatTemps(recette.temps_preparation)} variant="neutral" />
        </View>
      </View>
      <View style={{ padding: 16, gap: 6 }}>
        <Heading numberOfLines={2}>{recette.titre}</Heading>
        <BodySm numberOfLines={3}>{recette.description}</BodySm>
        <Price>{formatPrix(recette.cout_estime)}</Price>
      </View>
    </Card>
  );
}
