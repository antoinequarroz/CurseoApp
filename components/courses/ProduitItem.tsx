/** Item de liste de courses — ligne moderne avec checkbox tactile. */
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { NomProduitCourse, Caption } from '@/components/ui/Typography';
import { formatQuantite } from '@/lib/format';
import type { ItemCourse } from '@/types';

export function ProduitItem({ item, onToggle }: { item: ItemCourse; onToggle: () => void }) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const opaciteTexte = useSharedValue(item.coche ? 0.48 : 1);

  useEffect(() => {
    opaciteTexte.value = withTiming(item.coche ? 0.48 : 1, { duration: 220 });
  }, [item.coche, opaciteTexte]);

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
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: item.coche ? colors.bgSecondary : colors.bgCard,
        borderWidth: 1,
        borderColor: item.coche ? colors.bgSecondary : colors.border,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          borderWidth: 2,
          borderColor: item.coche ? colors.primary : colors.border,
          backgroundColor: item.coche ? colors.primary : colors.bgSecondary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.coche && <Check size={17} color="#FFFFFF" strokeWidth={3} />}
      </View>

      <Animated.View style={[{ flex: 1 }, texteStyle]}>
        <NomProduitCourse>{item.produit}</NomProduitCourse>
        <Caption>{formatQuantite(item.quantite, item.unite)}</Caption>
      </Animated.View>
    </Pressable>
  );
}
