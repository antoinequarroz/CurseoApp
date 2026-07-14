/** Item de liste de courses — checkbox avec animation de barre progressive (500ms) puis opacite 40%. */
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { Body, Caption } from '@/components/ui/Typography';
import { formatQuantite } from '@/lib/format';
import type { ItemCourse } from '@/types';

export function ProduitItem({ item, onToggle }: { item: ItemCourse; onToggle: () => void }) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const progresLigne = useSharedValue(item.coche ? 1 : 0);
  const opaciteTexte = useSharedValue(item.coche ? 0.4 : 1);

  useEffect(() => {
    progresLigne.value = withTiming(item.coche ? 1 : 0, { duration: 500 });
    opaciteTexte.value = withTiming(item.coche ? 0.4 : 1, { duration: 500 });
  }, [item.coche, progresLigne, opaciteTexte]);

  const ligneStyle = useAnimatedStyle(() => ({ width: `${progresLigne.value * 100}%` }));
  const texteStyle = useAnimatedStyle(() => ({ opacity: opaciteTexte.value }));

  return (
    <Pressable
      onPress={() => {
        void haptics.selection();
        onToggle();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.coche }}
      accessibilityLabel={`${item.produit}, ${formatQuantite(item.quantite, item.unite)}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: item.coche ? colors.primary : colors.border,
          backgroundColor: item.coche ? colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.coche && <Check size={16} color="#FFFFFF" />}
      </View>

      <View style={{ flex: 1 }}>
        <Animated.View style={texteStyle}>
          <View>
            <Body numberOfLines={1}>{item.produit}</Body>
            <View style={{ position: 'relative' }}>
              <Animated.View
                style={[{ position: 'absolute', height: 1, backgroundColor: colors.textMuted, top: '50%' }, ligneStyle]}
              />
            </View>
          </View>
        </Animated.View>
        <Caption>{formatQuantite(item.quantite, item.unite)}</Caption>
      </View>
    </Pressable>
  );
}
