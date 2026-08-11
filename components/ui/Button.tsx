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
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityHint,
  testID,
}: ButtonProps) {
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
      onPressIn={() => (scale.value = withTiming(0.96, { duration: 100 }))}
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
      testID={testID}
      style={[
        animatedStyle,
        {
          backgroundColor: bg,
          borderRadius: 28,
          borderCurve: 'continuous',
          minHeight: 54,
          paddingVertical: 16,
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || loading ? 0.55 : 1,
          boxShadow:
            variant === 'primary'
              ? `0 6px 18px ${colors.accentDark}38`
              : variant === 'success'
                ? '0 6px 18px rgba(15, 45, 39, 0.22)'
                : undefined,
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
