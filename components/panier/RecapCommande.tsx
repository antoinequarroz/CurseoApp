/**
 * Recapitulatif panier — gradient vert sauge -> vert menthe, montant en pulse
 * a chaque nouveau calcul d'economies (scale 1 -> 1.08 -> 1 + flash swipeLike).
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/lib/theme-context';
import { Button } from '@/components/ui/Button';
import { useHaptics } from '@/hooks/useHaptics';
import { formatPrix, formatEconomies } from '@/lib/format';
import { PanierEnseigneCard } from './PanierEnseigneCard';
import type { RecapCommande as RecapCommandeType } from '@/types';

export function RecapCommande({ recap, onValider }: { recap: RecapCommandeType; onValider: () => void }) {
  const { isDark } = useTheme();
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(withTiming(1.08, { duration: 150 }), withTiming(1, { duration: 150 }));
  }, [recap.economies, scale]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={{ gap: 16 }}>
      <LinearGradient
        colors={isDark ? ['#1B4332', '#2D6A4F'] : ['#2D6A4F', '#52B788']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, padding: 24, gap: 4 }}
      >
        <Animated.Text
          style={[
            pulseStyle,
            { fontFamily: 'DMMono_700Bold', fontSize: 40, color: '#FFFFFF' },
          ]}
        >
          {formatEconomies(recap.economies)}
        </Animated.Text>
        <Animated.Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
          Vous économisez par rapport à l&apos;enseigne la plus chère
        </Animated.Text>
      </LinearGradient>

      <View style={{ gap: 10 }}>
        {recap.paniers.map((panier) => (
          <PanierEnseigneCard key={panier.enseigne} panier={panier} />
        ))}
      </View>

      <Button
        label={`Valider mes courses — ${formatPrix(recap.montant_total)}`}
        onPress={() => {
          void haptics.heavy();
          onValider();
        }}
      />
    </View>
  );
}
