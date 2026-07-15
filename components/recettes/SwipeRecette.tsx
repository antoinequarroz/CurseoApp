/** Swipe droite = j'aime, swipe gauche = je passe. */
import React, { useState } from 'react';
import { Dimensions, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Heart, Info, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { analytics } from '@/lib/analytics';
import { t } from '@/lib/i18n';
import { RecetteCard } from './RecetteCard';
import type { Recette } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

interface SwipeRecetteProps {
  recette: Recette;
  profilId: string;
  onSwiped: (aime: boolean) => void;
  onTapDetail: () => void;
}

export function SwipeRecette({ recette, profilId, onSwiped, onTapDetail }: SwipeRecetteProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [swipeEnCours, setSwipeEnCours] = useState(false);

  const enregistrerSwipe = async (aime: boolean) => {
    void haptics[aime ? 'success' : 'error']();
    analytics[aime ? 'recipeSwipedLike' : 'recipeSwipedPass'](recette.id);
    try {
      await supabase.from('swipes').upsert({ profil_id: profilId, recette_id: recette.id, aime });
    } catch {
      // Le mode demo/TestFlight sans Supabase configure ne doit pas bloquer le swipe.
    }
    translateX.value = 0;
    translateY.value = 0;
    setSwipeEnCours(false);
    onSwiped(aime);
  };

  const declencherSwipe = (aime: boolean) => {
    if (swipeEnCours) return;
    setSwipeEnCours(true);
    translateX.value = withSpring(aime ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5, {}, () => {
      runOnJS(enregistrerSwipe)(aime);
    });
  };

  const gesture = Gesture.Pan()
    .onBegin(() => {
      runOnJS(setSwipeEnCours)(true);
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.2;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const aime = e.translationX > 0;
        translateX.value = withSpring(aime ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5, {}, () => {
          runOnJS(enregistrerSwipe)(aime);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        runOnJS(setSwipeEnCours)(false);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-10, 0, 10]);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      translateX.value,
      [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      [colors.swipePass, 'transparent', colors.swipeLike],
    ),
  }));

  const heartOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));

  const xOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
  }));

  return (
    <View style={{ gap: 14 }}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={cardStyle}>
          <Pressable onPress={onTapDetail} accessibilityRole="button" accessibilityLabel={t('recettes.voir_detail_de', { titre: recette.titre })}>
            <Animated.View
              pointerEvents="none"
              style={[{ position: 'absolute', inset: 0, borderRadius: 28, zIndex: 2 }, overlayStyle]}
            />
            <Animated.View style={[{ position: 'absolute', top: 24, right: 24, zIndex: 3 }, heartOpacity]}>
              <Heart size={54} color={colors.success} fill={colors.success} />
            </Animated.View>
            <Animated.View style={[{ position: 'absolute', top: 24, left: 24, zIndex: 3 }, xOpacity]}>
              <X size={54} color={colors.error} />
            </Animated.View>
            <RecetteCard recette={recette} variant="hero" />
          </Pressable>
        </Animated.View>
      </GestureDetector>

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
        <Pressable
          onPress={() => declencherSwipe(false)}
          accessibilityRole="button"
          accessibilityLabel={t('recettes.je_passe')}
          style={{
            width: 62,
            height: 62,
            borderRadius: 31,
            backgroundColor: colors.bgCard,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          <X size={26} color={colors.error} />
        </Pressable>
        <Pressable
          onPress={onTapDetail}
          accessibilityRole="button"
          accessibilityLabel={t('recettes.voir_detail')}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: colors.bgSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Info size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={() => declencherSwipe(true)}
          accessibilityRole="button"
          accessibilityLabel={t('recettes.jaime')}
          style={{
            width: 62,
            height: 62,
            borderRadius: 31,
            backgroundColor: colors.primaryDark,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.primary,
            shadowOpacity: 0.26,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          <Heart size={26} color="#FFFFFF" fill="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
