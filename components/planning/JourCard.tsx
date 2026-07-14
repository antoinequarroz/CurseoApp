import React from 'react';
import { Pressable, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Subheading, BodySm, Caption } from '@/components/ui/Typography';
import { useTheme } from '@/lib/theme-context';
import type { JourSemaine, RepasJour } from '@/types';

interface JourCardProps {
  jour: JourSemaine;
  repas: RepasJour;
  onPressSlot: (moment: 'midi' | 'soir') => void;
}

const LABEL_JOUR: Record<JourSemaine, string> = {
  lundi: 'Lundi',
  mardi: 'Mardi',
  mercredi: 'Mercredi',
  jeudi: 'Jeudi',
  vendredi: 'Vendredi',
  samedi: 'Samedi',
  dimanche: 'Dimanche',
};

function Slot({ label, titre, onPress }: { label: string; titre?: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={titre ? `${label} : ${titre}` : `Ajouter une recette pour ${label.toLowerCase()}`}
      style={{
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: titre ? 'solid' : 'dashed',
        borderColor: colors.border,
        padding: 10,
        minHeight: 56,
        justifyContent: 'center',
      }}
    >
      <Caption>{label}</Caption>
      <BodySm numberOfLines={1} style={{ color: titre ? colors.textPrimary : colors.textMuted }}>
        {titre ?? 'Ajouter'}
      </BodySm>
    </Pressable>
  );
}

export function JourCard({ jour, repas, onPressSlot }: JourCardProps) {
  return (
    <Card style={{ padding: 12, gap: 8 }}>
      <Subheading>{LABEL_JOUR[jour]}</Subheading>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Slot label="Midi" titre={repas.midi?.titre} onPress={() => onPressSlot('midi')} />
        <Slot label="Soir" titre={repas.soir?.titre} onPress={() => onPressSlot('soir')} />
      </View>
    </Card>
  );
}
