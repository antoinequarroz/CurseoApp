/** Liste de courses organisee par rayon, dans l'ordre fixe defini par ORDRE_RAYONS. */
import React from 'react';
import { View } from 'react-native';
import { ORDRE_RAYONS, type ItemCourse } from '@/types';
import { Card } from '@/components/ui/Card';
import { Heading, Caption } from '@/components/ui/Typography';
import { ProduitItem } from './ProduitItem';

interface ListeCoursesProps {
  items: ItemCourse[];
  onToggle: (id: string) => void;
  onSupprimer?: (id: string) => void;
}

export function ListeCourses({ items, onToggle, onSupprimer }: ListeCoursesProps) {
  const groupes = ORDRE_RAYONS.map((rayon) => ({
    rayon,
    items: items.filter((i) => i.rayon === rayon),
  })).filter((g) => g.items.length > 0);

  return (
    <View style={{ gap: 14 }}>
      {groupes.map((groupe) => (
        <Card key={groupe.rayon} style={{ padding: 14, gap: 10, borderRadius: 22, borderTopLeftRadius: 22 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Heading>{groupe.rayon}</Heading>
            <Caption>{groupe.items.length} article(s)</Caption>
          </View>
          {groupe.items.map((item) => (
            <ProduitItem
              key={item.id}
              item={item}
              onToggle={() => onToggle(item.id)}
              onSupprimer={!item.recette_origine && onSupprimer ? () => onSupprimer(item.id) : undefined}
            />
          ))}
        </Card>
      ))}
    </View>
  );
}
