/**
 * Carrousel "Inspirations pour vous" de l'accueil (refonte Coursia) — quelques
 * recettes a decouvrir en un coup d'oeil, avec un coeur pour aimer directement
 * sans passer par le swipe. Reutilise le meme mock que Planifier/Communaute.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Heart } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/lib/supabase';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';
import { Subheading, BodySm, Caption } from '@/components/ui/Typography';
import { formatTemps } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { Recette } from '@/types';

const NB_INSPIRATIONS = 6;
const CARD_WIDTH = 168;

function CarteInspiration({ recette, profilId }: { recette: Recette; profilId: string }) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [aime, setAime] = useState(false);

  const basculerJaime = async () => {
    void haptics.selection();
    const prochainEtat = !aime;
    setAime(prochainEtat);
    try {
      await supabase.from('swipes').upsert({ profil_id: profilId, recette_id: recette.id, aime: prochainEtat });
    } catch {
      // Mode demo/offline sans Supabase configure : le coeur reste actif localement.
    }
  };

  return (
    <Pressable
      onPress={() => router.push(`/recette/${recette.id}`)}
      accessibilityRole="button"
      accessibilityLabel={t('recettes.voir_detail_de', { titre: recette.titre })}
      style={{ width: CARD_WIDTH, gap: 8 }}
    >
      <View style={{ height: 110, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.bgSecondary }}>
        <Image
          source={{ uri: `${recette.image_url}?auto=format&fit=crop&w=500&q=70` }}
          placeholder={recette.blurhash}
          contentFit="cover"
          transition={120}
          cachePolicy="memory-disk"
          style={{ width: '100%', height: '100%' }}
          accessibilityLabel={`Photo de ${recette.titre}`}
        />
        <Pressable
          onPress={basculerJaime}
          accessibilityRole="button"
          accessibilityLabel={aime ? t('recettes.retirer_favoris') : t('recettes.jaime')}
          hitSlop={8}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Heart size={14} color="#FFFFFF" fill={aime ? '#FFFFFF' : 'transparent'} />
        </Pressable>
      </View>
      <Subheading numberOfLines={1}>{recette.titre}</Subheading>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Caption>{formatTemps(recette.temps_preparation)}</Caption>
      </View>
    </Pressable>
  );
}

export function InspirationsCarousel({ profilId }: { profilId: string }) {
  const inspirations = React.useMemo(() => RECETTES_MOCK.slice(0, NB_INSPIRATIONS), []);

  return (
    <View style={{ gap: 12 }}>
      <BodySm style={{ fontWeight: '600' }}>{t('accueil.inspirations_titre')}</BodySm>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
        {inspirations.map((recette) => (
          <CarteInspiration key={recette.id} recette={recette} profilId={profilId} />
        ))}
      </ScrollView>
    </View>
  );
}
