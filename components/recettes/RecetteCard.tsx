/** Card recette — image, badges difficulté/temps, prix. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { ImageOff } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useResponsive } from '@/hooks/useResponsive';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TitreRecetteCard, DescriptionRecetteCard, Caption, Price } from '@/components/ui/Typography';
import { formatPrix, formatTemps } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { Recette } from '@/types';
import type { AlerteAllergene } from '@/hooks/useRecettes';

const COULEUR_DIFFICULTE: Record<Recette['difficulte'], 'success' | 'warning' | 'error'> = {
  facile: 'success',
  moyen: 'warning',
  difficile: 'error',
};

export function RecetteCard({
  recette,
  variant = 'default',
  alerteAllergenes,
}: {
  recette: Recette;
  variant?: 'default' | 'hero';
  /** COUR-22 : allergene de l'utilisateur possiblement present (deduction ambigue) — jamais une exclusion automatique, toujours affiche pour que la recette ne soit jamais percue comme sure a tort. */
  alerteAllergenes?: AlerteAllergene[];
}) {
  const { colors, isDark } = useTheme();
  const { isSmall } = useResponsive();
  const imageHeight = variant === 'hero' ? (isSmall ? 220 : 260) : isSmall ? 180 : 200;
  const [imageEnEchec, setImageEnEchec] = useState(false);

  return (
    <Card style={variant === 'hero' ? { borderRadius: 28, borderTopLeftRadius: 28 } : undefined}>
      <View style={{ height: imageHeight, backgroundColor: colors.bgSecondary }}>
        {imageEnEchec ? (
          // Repli si l'URL de l'image est cassee (ex. photo Unsplash supprimee) —
          // sans ca la carte affichait un rectangle vide/noir, sans indice visuel.
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ImageOff size={28} color={colors.textMuted} />
          </View>
        ) : (
          <Image
            source={{ uri: `${recette.image_url}?auto=format&fit=crop&w=1000&q=80` }}
            placeholder={recette.blurhash}
            contentFit="cover"
            transition={120}
            cachePolicy="memory-disk"
            style={{ width: '100%', height: '100%' }}
            accessibilityLabel={`Photo de ${recette.titre}`}
            onError={() => setImageEnEchec(true)}
          />
        )}
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
        {alerteAllergenes && alerteAllergenes.length > 0 && (
          <Badge
            label={t('recettes.allergene_possible', { allergenes: alerteAllergenes.map((a) => a.libelle).join(', ') })}
            variant="warning"
          />
        )}
        <DescriptionRecetteCard>{recette.description}</DescriptionRecetteCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <Price>{formatPrix(recette.cout_estime)}</Price>
          <Caption>{recette.portions} portions</Caption>
        </View>
      </View>
    </Card>
  );
}
