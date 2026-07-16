import React from 'react';
import { Pressable, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Subheading, TitreRecettePlanning, Caption } from '@/components/ui/Typography';
import { useTheme } from '@/lib/theme-context';
import { t } from '@/lib/i18n';
import type { JourSemaine, RepasJour } from '@/types';

interface JourCardProps {
  jour: JourSemaine;
  repas: RepasJour;
  onPressSlot: (moment: 'midi' | 'soir') => void;
}

const LABEL_JOUR: Record<JourSemaine, string> = {
  lundi: t('planning.jour_lundi'),
  mardi: t('planning.jour_mardi'),
  mercredi: t('planning.jour_mercredi'),
  jeudi: t('planning.jour_jeudi'),
  vendredi: t('planning.jour_vendredi'),
  samedi: t('planning.jour_samedi'),
  dimanche: t('planning.jour_dimanche'),
};

function Slot({ label, titre, ignore, onPress }: { label: string; titre?: string; ignore?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const texteAffiche = titre ?? (ignore ? t('planning.slot_rien_prevu') : t('planning.slot_ajouter'));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        titre
          ? t('planning.slot_label', { label, titre })
          : t('planning.slot_label_vide', { label: label.toLowerCase() })
      }
      style={{
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: titre ? 'solid' : 'dashed',
        borderColor: colors.border,
        padding: 10,
        minHeight: 56,
        justifyContent: 'center',
        opacity: ignore ? 0.6 : 1,
      }}
    >
      <Caption>{label}</Caption>
      <TitreRecettePlanning style={{ color: titre ? colors.textPrimary : colors.textMuted }}>
        {texteAffiche}
      </TitreRecettePlanning>
    </Pressable>
  );
}

export function JourCard({ jour, repas, onPressSlot }: JourCardProps) {
  return (
    <Card style={{ padding: 12, gap: 8 }}>
      <Subheading>{LABEL_JOUR[jour]}</Subheading>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Slot
          label={t('planning.slot_midi')}
          titre={repas.midi?.recette.titre}
          ignore={repas.midiIgnore}
          onPress={() => onPressSlot('midi')}
        />
        <Slot
          label={t('planning.slot_soir')}
          titre={repas.soir?.recette.titre}
          ignore={repas.soirIgnore}
          onPress={() => onPressSlot('soir')}
        />
      </View>
    </Card>
  );
}
