/** Liste de courses organisee par rayon, dans l'ordre fixe defini par ORDRE_RAYONS. */
import React from 'react';
import { View } from 'react-native';
import { ORDRE_RAYONS, type ItemCourse } from '@/types';
import { Heading } from '@/components/ui/Typography';
import { ProduitItem } from './ProduitItem';

interface ListeCoursesProps {
  items: ItemCourse[];
  onToggle: (id: string) => void;
}

export function ListeCourses({ items, onToggle }: ListeCoursesProps) {
  const groupes = ORDRE_RAYONS.map((rayon) => ({
    rayon,
    items: items.filter((i) => i.rayon === rayon),
  })).filter((g) => g.items.length > 0);

  return (
    <View style={{ gap: 20 }}>
      {groupes.map((groupe) => (
        <View key={groupe.rayon} style={{ gap: 4 }}>
          <Heading>{groupe.rayon}</Heading>
          {groupe.items.map((item) => (
            <ProduitItem key={item.id} item={item} onToggle={() => onToggle(item.id)} />
          ))}
        </View>
      ))}
    </View>
  );
}
