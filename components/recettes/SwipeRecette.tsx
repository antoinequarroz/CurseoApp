/**
 * Composant cle de l'app. Swipe droite = J'aime, swipe gauche = Je passe.
 * La card change progressivement de fond vers swipeLike/swipePass pendant
 * le geste, avec une icone qui apparait en opacite progressive.
 * Boutons alternatifs (coeur/X) fournis pour l'accessibilite (VoiceOver/TalkBack).
 */
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
import { Heart, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { analytics } from '@/lib/analytics';
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
    await supabase.from('swipes').upsert({ profil_id: profilId, recette_id: recette.id, aime });
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
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-12, 0, 12]);
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
    <View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={cardStyle}>
          <Pressable onPress={onTapDetail} accessibilityRole="button" accessibilityLabel={`Voir le détail de ${recette.titre}`}>
            <Animated.View
              pointerEvents="none"
              style={[{ position: 'absolute', inset: 0, borderRadius: 16, zIndex: 2 }, overlayStyle]}
            />
            <Animated.View style={[{ position: 'absolute', top: 24, right: 24, zIndex: 3 }, heartOpacity]}>
              <Heart size={48} color={colors.success} fill={colors.success} />
            </Animated.View>
            <Animated.View style={[{ position: 'absolute', top: 24, left: 24, zIndex: 3 }, xOpacity]}>
              <X size={48} color={colors.error} />
            </Animated.View>
            <RecetteCard recette={recette} />
          </Pressable>
        </Animated.View>
      </GestureDetector>

      {/* Boutons alternatifs — accessibilite pour les utilisateurs qui ne peuvent pas swiper */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 32, marginTop: 20 }}>
        <Pressable
          onPress={() => declencherSwipe(false)}
          accessibilityRole="button"
          accessibilityLabel="Je passe cette recette"
          accessibilityHint="Équivalent à un swipe vers la gauche"
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.swipePass, alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={26} color={colors.error} />
        </Pressable>
        <Pressable
          onPress={() => declencherSwipe(true)}
          accessibilityRole="button"
          accessibilityLabel="J'aime cette recette"
          accessibilityHint="Équivalent à un swipe vers la droite"
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.swipeLike, alignItems: 'center', justifyContent: 'center' }}
        >
          <Heart size={26} color={colors.success} />
        </Pressable>
      </View>
    </View>
  );
}
