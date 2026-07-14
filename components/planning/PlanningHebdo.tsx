import React from 'react';
import { View } from 'react-native';
import { JOURS_SEMAINE, type JourSemaine, type PlanningHebdomadaire } from '@/types';
import { JourCard } from './JourCard';

interface PlanningHebdoProps {
  planning: PlanningHebdomadaire;
  onPressSlot: (jour: JourSemaine, moment: 'midi' | 'soir') => void;
}

export function PlanningHebdo({ planning, onPressSlot }: PlanningHebdoProps) {
  return (
    <View style={{ gap: 12 }}>
      {JOURS_SEMAINE.map((jour) => (
        <JourCard key={jour} jour={jour} repas={planning[jour]} onPressSlot={(moment) => onPressSlot(jour, moment)} />
      ))}
    </View>
  );
}
