/** Swipe droite = j'aime, swipe gauche = je passe. */
import React, { useState } from 'react';
import { Dimensions, Pressable, View, type AccessibilityRole } from 'react-native';
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
  // Lu depuis les worklets du geste (thread UI) : setSwipeEnCours seul ne
  // suffit pas a bloquer un nouveau .onUpdate/.onEnd declenche pendant que la
  // carte precedente est encore en train de s'animer hors de l'ecran, ce qui
  // pouvait provoquer un double enregistrerSwipe() pour la meme recette.
  const swipeVerrou = useSharedValue(false);

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
    swipeVerrou.value = false;
    onSwiped(aime);
  };

  const declencherSwipe = (aime: boolean) => {
    if (swipeEnCours) return;
    setSwipeEnCours(true);
    swipeVerrou.value = true;
    translateX.value = withSpring(aime ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5, {}, () => {
      runOnJS(enregistrerSwipe)(aime);
    });
  };

  // activeOffsetX : un simple tap (deplacement < 10px) ne declenche jamais le
  // Pan, il est libre d'etre reconnu comme un tap par le geste ci-dessous —
  // sans ca, un swipe complet pouvait aussi etre interprete comme un appui
  // (le Pressable imbrique s'ouvrait en meme temps que le swipe s'executait).
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onBegin(() => {
      if (swipeVerrou.value) return;
      runOnJS(setSwipeEnCours)(true);
    })
    .onUpdate((e) => {
      if (swipeVerrou.value) return;
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.2;
    })
    .onEnd((e) => {
      if (swipeVerrou.value) return;
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const aime = e.translationX > 0;
        swipeVerrou.value = true;
        translateX.value = withSpring(aime ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5, {}, () => {
          runOnJS(enregistrerSwipe)(aime);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        runOnJS(setSwipeEnCours)(false);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (swipeVerrou.value) return;
    runOnJS(onTapDetail)();
  });

  // Exclusive : le Pan est tente en premier ; s'il n'atteint jamais son seuil
  // d'activation (mouvement < 10px), le Tap prend le relais — les deux ne
  // peuvent plus se declencher pour le meme geste.
  const gesture = Gesture.Exclusive(panGesture, tapGesture);

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
        <Animated.View
          style={cardStyle}
          accessible
          accessibilityRole={'button' as AccessibilityRole}
          accessibilityLabel={t('recettes.voir_detail_de', { titre: recette.titre })}
          // Le geste Tap (react-native-gesture-handler) ne recoit pas les activations
          // synthetiques de VoiceOver/TalkBack — sans onAccessibilityTap, un double-tap
          // lecteur d'ecran sur la carte ne declenchait plus onTapDetail (regression
          // introduite en remplacant le Pressable par un geste compose).
          onAccessibilityTap={onTapDetail}
        >
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', inset: 0, borderRadius: 28, zIndex: 2 }, overlayStyle]}
          />
          <Animated.View style={[{ position: 'absolute', top: 24, right: 24, zIndex: 3 }, heartOpacity]}>
            <Heart size={54} color={colors.accentDark} fill={colors.accentDark} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', top: 24, left: 24, zIndex: 3 }, xOpacity]}>
            <X size={54} color={colors.textPrimary} />
          </Animated.View>
          <RecetteCard recette={recette} variant="hero" />
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
          <X size={26} color={colors.textPrimary} />
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
            backgroundColor: colors.accentDark,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.accentDark,
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
