/** Liste de courses organisee par rayon, dans l'ordre fixe defini par ORDRE_RAYONS — sections repliables. */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { ORDRE_RAYONS, type ItemCourse, type Rayon } from '@/types';
import { Card } from '@/components/ui/Card';
import { Heading, Caption } from '@/components/ui/Typography';
import { ProduitItem } from './ProduitItem';

interface ListeCoursesProps {
  items: ItemCourse[];
  onToggle: (id: string) => void;
  onSupprimer?: (id: string) => void;
}

export function ListeCourses({ items, onToggle, onSupprimer }: ListeCoursesProps) {
  const { colors } = useTheme();
  const [rayonsReplies, setRayonsReplies] = useState<Set<Rayon>>(new Set());

  const groupes = ORDRE_RAYONS.map((rayon) => ({
    rayon,
    items: items.filter((i) => i.rayon === rayon),
  })).filter((g) => g.items.length > 0);

  const basculerRayon = (rayon: Rayon) => {
    setRayonsReplies((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(rayon)) suivant.delete(rayon);
      else suivant.add(rayon);
      return suivant;
    });
  };

  return (
    <View style={{ gap: 14 }}>
      {groupes.map((groupe) => {
        const replie = rayonsReplies.has(groupe.rayon);
        return (
          <Card key={groupe.rayon} style={{ padding: 14, gap: replie ? 0 : 10, borderRadius: 22, borderTopLeftRadius: 22 }}>
            <Pressable
              onPress={() => basculerRayon(groupe.rayon)}
              accessibilityRole="button"
              accessibilityState={{ expanded: !replie }}
              accessibilityLabel={groupe.rayon}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Heading>{groupe.rayon}</Heading>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Caption>{groupe.items.length} article(s)</Caption>
                <ChevronDown size={16} color={colors.textMuted} style={{ transform: [{ rotate: replie ? '-90deg' : '0deg' }] }} />
              </View>
            </Pressable>
            {!replie &&
              groupe.items.map((item) => (
                <ProduitItem
                  key={item.id}
                  item={item}
                  onToggle={() => onToggle(item.id)}
                  onSupprimer={!item.recette_origine && onSupprimer ? () => onSupprimer(item.id) : undefined}
                />
              ))}
          </Card>
        );
      })}
    </View>
  );
}
