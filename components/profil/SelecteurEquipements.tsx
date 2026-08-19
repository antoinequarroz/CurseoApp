import React from 'react';
import { Pressable, View } from 'react-native';
import {
  Check,
  ChefHat,
  CookingPot,
  Flame,
  Microwave,
  Settings2,
  Soup,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { EQUIPEMENTS_CUISINE } from '@/lib/equipementsCuisine';
import { BodySm } from '@/components/ui/Typography';
import { t } from '@/lib/i18n';
import type { EquipementCuisine } from '@/types';

const ICONES: Record<EquipementCuisine, LucideIcon> = {
  plaques_cuisson: CookingPot,
  four: ChefHat,
  micro_ondes: Microwave,
  air_fryer: Wind,
  mixeur: Soup,
  robot_cuisine: Settings2,
  grill: Flame,
  cuiseur_vapeur: CookingPot,
};

export function SelecteurEquipements({
  valeur,
  onChange,
}: {
  valeur: EquipementCuisine[] | null;
  onChange: (valeur: EquipementCuisine[]) => void;
}) {
  const { colors } = useTheme();
  const selection = valeur ?? [];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {EQUIPEMENTS_CUISINE.map((id) => {
        const selected = selection.includes(id);
        const Icon = ICONES[id];
        const label = t(`equipements.${id}`);
        return (
          <Pressable
            key={id}
            onPress={() => onChange(selected ? selection.filter((item) => item !== id) : [...selection, id])}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={label}
            style={{
              width: '48%',
              minHeight: 92,
              padding: 14,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primary : colors.bgSecondary,
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Icon size={22} color={selected ? '#FFFFFF' : colors.textPrimary} strokeWidth={1.8} />
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: selected ? '#FFFFFF' : colors.textMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selected ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
              </View>
            </View>
            <BodySm style={{ color: selected ? '#FFFFFF' : colors.textPrimary, fontWeight: '600' }}>
              {label}
            </BodySm>
          </Pressable>
        );
      })}
    </View>
  );
}
