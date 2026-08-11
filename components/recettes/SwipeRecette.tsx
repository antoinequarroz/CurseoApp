/** Swipe droite = j'aime, swipe gauche = je passe. */
import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, View, type AccessibilityRole } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Heart, Info, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { analytics } from '@/lib/analytics';
import { t } from '@/lib/i18n';
import { RecetteCard } from './RecetteCard';
import type { Recette } from '@/types';
import type { AlerteAllergene } from '@/hooks/useRecettes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const SWIPE_VELOCITY_THRESHOLD = 800;
const SWIPE_EXIT_DURATION = 190;
const IMAGE_PARAMS = '?auto=format&fit=crop&w=1000&q=80';

const RETOUR_SPRING = {
  damping: 22,
  stiffness: 260,
  mass: 0.75,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
} as const;

interface SwipeRecetteProps {
  recette: Recette;
  /** Préchargée pendant que la carte courante est visible. */
  recetteSuivante?: Recette;
  profilId: string;
  /** COUR-22 : allergenes de l'utilisateur matches en 'possible' seulement (ex. deduction ambigue d'un ingredient) — jamais une exclusion, toujours un signalement explicite. */
  alerteAllergenes?: AlerteAllergene[];
  onSwiped: (aime: boolean) => void;
  onTapDetail: () => void;
}

export function SwipeRecette({
  recette,
  recetteSuivante,
  profilId,
  alerteAllergenes,
  onSwiped,
  onTapDetail,
}: SwipeRecetteProps) {
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

  useEffect(() => {
    if (!recetteSuivante?.image_url) return;
    void Image.prefetch(`${recetteSuivante.image_url}${IMAGE_PARAMS}`, { cachePolicy: 'memory-disk' }).catch(() => {
      // Une image non prechargee sera simplement chargee par RecetteCard.
    });
  }, [recetteSuivante?.image_url]);

  const persisterSwipe = async (aime: boolean) => {
    try {
      await supabase.from('swipes').upsert({ profil_id: profilId, recette_id: recette.id, aime });
    } catch {
      // Le mode demo/TestFlight sans Supabase configure ne doit pas bloquer le swipe.
    }
  };

  const confirmerSwipe = (aime: boolean) => {
    // "Je passe" est une préférence neutre, pas une erreur : un retour de
    // sélection léger est plus naturel qu'une vibration d'échec.
    void haptics[aime ? 'success' : 'selection']();
  };

  const finaliserSwipe = (aime: boolean) => {
    analytics[aime ? 'recipeSwipedLike' : 'recipeSwipedPass'](recette.id);
    setSwipeEnCours(false);
    // Le changement de carte est optimiste : l'utilisateur ne doit jamais
    // attendre le réseau Supabase entre deux recettes.
    onSwiped(aime);
    void persisterSwipe(aime);
  };

  const animerSortie = (aime: boolean) => {
    'worklet';
    translateX.value = withTiming(
      aime ? SCREEN_WIDTH * 1.35 : -SCREEN_WIDTH * 1.35,
      { duration: SWIPE_EXIT_DURATION, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
      (termine) => {
        if (termine) runOnJS(finaliserSwipe)(aime);
      },
    );
  };

  const declencherSwipe = (aime: boolean) => {
    if (swipeEnCours) return;
    setSwipeEnCours(true);
    swipeVerrou.value = true;
    confirmerSwipe(aime);
    animerSortie(aime);
  };

  // activeOffsetX : un simple tap (deplacement < 10px) ne declenche jamais le
  // Pan, il est libre d'etre reconnu comme un tap par le geste ci-dessous —
  // sans ca, un swipe complet pouvait aussi etre interprete comme un appui
  // (le Pressable imbrique s'ouvrait en meme temps que le swipe s'executait).
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-24, 24])
    .onUpdate((e) => {
      if (swipeVerrou.value) return;
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.12;
    })
    .onEnd((e) => {
      if (swipeVerrou.value) return;
      const projectionX = e.translationX + e.velocityX * 0.12;
      const gesteAssume =
        Math.abs(e.translationX) > SWIPE_THRESHOLD ||
        (Math.abs(e.velocityX) > SWIPE_VELOCITY_THRESHOLD && Math.abs(e.translationX) > 24);
      if (gesteAssume) {
        const aime = projectionX > 0;
        swipeVerrou.value = true;
        runOnJS(setSwipeEnCours)(true);
        runOnJS(confirmerSwipe)(aime);
        animerSortie(aime);
      } else {
        translateX.value = withSpring(0, RETOUR_SPRING);
        translateY.value = withSpring(0, RETOUR_SPRING);
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
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-8, 0, 8], 'clamp');
    const scale = interpolate(Math.abs(translateX.value), [0, SWIPE_THRESHOLD], [1, 0.985], 'clamp');
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale },
      ],
    };
  });

  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 0.9], 'clamp'),
  }));

  const passOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [0.9, 0], 'clamp'),
  }));

  const heartOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0.25, 1], 'clamp') }],
  }));

  const xOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
    transform: [{ scale: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0.25], 'clamp') }],
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
            style={[
              { position: 'absolute', inset: 0, borderRadius: 28, zIndex: 2, backgroundColor: colors.swipeLike },
              likeOverlayStyle,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', inset: 0, borderRadius: 28, zIndex: 2, backgroundColor: colors.swipePass },
              passOverlayStyle,
            ]}
          />
          <Animated.View style={[{ position: 'absolute', top: 24, right: 24, zIndex: 3 }, heartOpacity]}>
            <Heart size={54} color={colors.accentDark} fill={colors.accentDark} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', top: 24, left: 24, zIndex: 3 }, xOpacity]}>
            <X size={54} color={colors.textPrimary} />
          </Animated.View>
          <RecetteCard recette={recette} variant="hero" alerteAllergenes={alerteAllergenes} />
        </Animated.View>
      </GestureDetector>

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
        <Pressable
          testID="recipe-pass"
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
          testID="recipe-details"
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
          testID="recipe-like"
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
