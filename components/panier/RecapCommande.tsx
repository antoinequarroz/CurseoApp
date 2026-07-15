/**
 * Recapitulatif panier — gradient vert sauge -> vert menthe, montant en pulse
 * a chaque nouveau calcul d'economies (scale 1 -> 1.08 -> 1 + flash swipeLike).
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { useHaptics } from '@/hooks/useHaptics';
import { t } from '@/lib/i18n';
import { formatPrix, formatEconomies } from '@/lib/format';
import { PanierEnseigneCard } from './PanierEnseigneCard';
import type { RecapCommande as RecapCommandeType } from '@/types';

export function RecapCommande({ recap, onValider }: { recap: RecapCommandeType; onValider: () => void }) {
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(withTiming(1.08, { duration: 150 }), withTiming(1, { duration: 150 }));
  }, [recap.economies, scale]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={{ gap: 16 }}>
      {/* Degrade fixe (independant du theme) — les deux teintes garantissent >=4.5:1 avec le texte blanc. */}
      <LinearGradient
        colors={['#1B3A2E', '#3E6B52']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, padding: 24, gap: 4 }}
      >
        <Animated.Text
          style={[
            pulseStyle,
            { fontFamily: 'DMMono_500Medium', fontSize: 40, lineHeight: 46, color: '#FFFFFF' },
          ]}
        >
          {formatEconomies(recap.economies)}
        </Animated.Text>
        <Animated.Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
          {t('panier.economie_message')}
        </Animated.Text>
      </LinearGradient>

      <View style={{ gap: 10 }}>
        {recap.paniers.map((panier) => (
          <PanierEnseigneCard key={panier.enseigne} panier={panier} />
        ))}
      </View>

      <Button
        label={t('panier.valider_montant', { montant: formatPrix(recap.montant_total) })}
        onPress={() => {
          void haptics.heavy();
          onValider();
        }}
      />
    </View>
  );
}
