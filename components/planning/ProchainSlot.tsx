/**
 * Met en avant le prochain repas non decide de la semaine (ex: "Lundi midi")
 * avec un choix binaire clair : choisir une recette, ou dire explicitement
 * qu'il n'y a rien de prevu ce moment-la — plutot que d'afficher les 7 jours
 * en vrac et laisser l'utilisateur deviner par ou commencer.
 */
import React from 'react';
import { View } from 'react-native';
import { CalendarCheck } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Caption, Heading } from '@/components/ui/Typography';
import { useTheme } from '@/lib/theme-context';
import { t } from '@/lib/i18n';
import type { JourSemaine } from '@/types';

const LABEL_JOUR: Record<JourSemaine, string> = {
  lundi: t('planning.jour_lundi'),
  mardi: t('planning.jour_mardi'),
  mercredi: t('planning.jour_mercredi'),
  jeudi: t('planning.jour_jeudi'),
  vendredi: t('planning.jour_vendredi'),
  samedi: t('planning.jour_samedi'),
  dimanche: t('planning.jour_dimanche'),
};

interface ProchainSlotProps {
  jour: JourSemaine;
  moment: 'midi' | 'soir';
  onChoisirRecette: () => void;
  onIgnorer: () => void;
}

export function ProchainSlot({ jour, moment, onChoisirRecette, onIgnorer }: ProchainSlotProps) {
  const { colors } = useTheme();
  const labelMoment = moment === 'midi' ? t('planning.slot_midi') : t('planning.slot_soir');

  return (
    <Card style={{ padding: 20, gap: 14, borderRadius: 24, borderTopLeftRadius: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <CalendarCheck size={20} color={colors.primary} />
        <Caption>{t('planning.prochain_a_planifier')}</Caption>
      </View>
      <Heading>{`${LABEL_JOUR[jour]} ${labelMoment.toLowerCase()}`}</Heading>
      <Button label={t('planning.choisir_recette_bouton')} onPress={onChoisirRecette} />
      <Button label={t('planning.rien_prevu_bouton')} variant="secondary" onPress={onIgnorer} />
    </Card>
  );
}
