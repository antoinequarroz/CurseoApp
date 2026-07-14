/** Loading states professionnels — shimmer bgSecondary -> bgCard -> bgSecondary (1200ms). Jamais un spinner seul. */
import React, { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, interpolateColor } from 'react-native-reanimated';
import { useTheme } from '@/lib/theme-context';

function SkeletonBlock({ width, height, radius = 8 }: { width: DimensionValue; height: number; radius?: number }) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.bgSecondary, colors.bgCard]),
  }));

  return <Animated.View style={[{ width, height, borderRadius: radius }, style]} />;
}

export function SkeletonRecetteCard() {
  return (
    <View style={{ gap: 12 }}>
      <SkeletonBlock width="100%" height={200} radius={16} />
      <SkeletonBlock width="70%" height={20} />
      <SkeletonBlock width="40%" height={16} />
    </View>
  );
}

export function SkeletonListeCourses() {
  return (
    <View style={{ gap: 16 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SkeletonBlock width={24} height={24} radius={6} />
          <SkeletonBlock width="60%" height={16} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonPlanningJour() {
  return (
    <View style={{ gap: 8 }}>
      <SkeletonBlock width="30%" height={14} />
      <SkeletonBlock width="100%" height={72} radius={16} />
    </View>
  );
}

export function SkeletonComparateur() {
  return (
    <View style={{ gap: 10 }}>
      {[0, 1, 2, 3].map((i) => (
        <SkeletonBlock key={i} width="100%" height={40} radius={10} />
      ))}
    </View>
  );
}
