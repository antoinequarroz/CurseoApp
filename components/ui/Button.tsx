/** Bouton CTA primaire — scale 0.97 au press + haptic light, pill radius 28px. */
import React from 'react';
import { ActivityIndicator, Pressable, type AccessibilityRole } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { Subheading } from './Typography';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'success';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({ label, onPress, variant = 'primary', disabled, loading, accessibilityHint }: ButtonProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // accentDark (corail fonce, ~4.67:1 avec du blanc dans les deux themes) est le
  // CTA du moodboard — le corail vif (accent) seul ne passe pas AA avec du texte blanc.
  // '#0F2D27' (vert foret fixe, ~14.7:1 avec du blanc) sert pour le variant "success"
  // (ex. Valider mes courses) — colors.primary s'eclaircit en dark mode et ne
  // passerait plus AA comme fond de bouton avec du texte blanc.
  const bg =
    variant === 'primary'
      ? colors.accentDark
      : variant === 'success'
        ? '#0F2D27'
        : variant === 'secondary'
          ? colors.bgSecondary
          : 'transparent';
  const textColor = variant === 'primary' || variant === 'success' ? '#FFFFFF' : colors.primary;

  return (
    <AnimatedPressable
      onPressIn={() => (scale.value = withTiming(0.97, { duration: 100 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 100 }))}
      onPress={() => {
        if (disabled || loading) return;
        void haptics.light();
        onPress();
      }}
      disabled={disabled || loading}
      accessibilityRole={'button' as AccessibilityRole}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        animatedStyle,
        {
          backgroundColor: bg,
          borderRadius: 28,
          paddingVertical: 16,
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
          shadowColor: variant === 'primary' ? colors.accentDark : variant === 'success' ? '#0F2D27' : 'transparent',
          shadowOpacity: variant === 'primary' || variant === 'success' ? 0.25 : 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Subheading style={{ color: textColor }}>{label}</Subheading>
      )}
    </AnimatedPressable>
  );
}
