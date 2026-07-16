/**
 * Vue "Planning" en semaine — bandeau de jours (façon moodboard) + vignettes
 * Midi/Soir pour le jour selectionne. Selectionne par defaut le prochain jour
 * sans menu (voir trouverProchainSlot dans planifier.tsx) plutot que "aujourd'hui".
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { Heading, Subheading, Caption, TitreRecettePlanning } from '@/components/ui/Typography';
import { dates } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { JOURS_SEMAINE, type JourSemaine, type PlanningHebdomadaire, type RepasPlanifie } from '@/types';

const LETTRE_JOUR: Record<JourSemaine, string> = {
  lundi: 'LUN',
  mardi: 'MAR',
  mercredi: 'MER',
  jeudi: 'JEU',
  vendredi: 'VEN',
  samedi: 'SAM',
  dimanche: 'DIM',
};

function TuileRepas({
  label,
  repasPlanifie,
  ignore,
  onPress,
  onIgnorer,
}: {
  label: string;
  repasPlanifie?: RepasPlanifie;
  ignore?: boolean;
  onPress: () => void;
  onIgnorer: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      <Heading>{label}</Heading>
      {repasPlanifie ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t('planning.slot_label', { label, titre: repasPlanifie.recette.titre })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Image
            source={{ uri: `${repasPlanifie.recette.image_url}?auto=format&fit=crop&w=200&q=70` }}
            placeholder={repasPlanifie.recette.blurhash}
            contentFit="cover"
            style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: colors.bgSecondary }}
            accessibilityLabel={`Photo de ${repasPlanifie.recette.titre}`}
          />
          <TitreRecettePlanning style={{ flex: 1, color: colors.textPrimary }}>
            {repasPlanifie.recette.titre}
          </TitreRecettePlanning>
        </Pressable>
      ) : (
        <View style={{ gap: 6 }}>
          <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={t('planning.slot_label_vide', { label: label.toLowerCase() })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 8,
              borderRadius: 14,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.bgSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={18} color={colors.textMuted} />
            </View>
            <Caption>{ignore ? t('planning.slot_rien_prevu') : t('planning.slot_ajouter')}</Caption>
          </Pressable>
          {!ignore && (
            <Pressable onPress={onIgnorer} accessibilityRole="button" accessibilityLabel={t('planning.rien_prevu_bouton')} hitSlop={8}>
              <Caption style={{ color: colors.textMuted, textDecorationLine: 'underline' }}>
                {t('planning.rien_prevu_bouton')}
              </Caption>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export function PlanningSemaine({
  planning,
  jourInitial,
  onPressSlot,
  onIgnorer,
}: {
  planning: PlanningHebdomadaire;
  jourInitial: JourSemaine;
  onPressSlot: (jour: JourSemaine, moment: 'midi' | 'soir') => void;
  onIgnorer: (jour: JourSemaine, moment: 'midi' | 'soir') => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [jourSelectionne, setJourSelectionne] = useState<JourSemaine>(jourInitial);

  const debutSemaine = dates.debutSemaine(dates.maintenant());
  const finSemaine = new Date(debutSemaine);
  finSemaine.setDate(finSemaine.getDate() + 6);
  const periode = `${dates.formatCourt(debutSemaine)} – ${dates.formatCourt(finSemaine)}`;
  const repas = planning[jourSelectionne];

  return (
    <View style={{ gap: 20 }}>
      <Subheading>{periode}</Subheading>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {JOURS_SEMAINE.map((jour, i) => {
          const date = new Date(debutSemaine);
          date.setDate(date.getDate() + i);
          const selectionne = jour === jourSelectionne;
          return (
            <Pressable
              key={jour}
              onPress={() => {
                void haptics.selection();
                setJourSelectionne(jour);
              }}
              accessibilityRole="button"
              accessibilityLabel={t(`planning.jour_${jour}`)}
              accessibilityState={{ selected: selectionne }}
              style={{ alignItems: 'center', gap: 6 }}
            >
              <Caption>{LETTRE_JOUR[jour]}</Caption>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selectionne ? colors.primary : 'transparent',
                }}
              >
                <Caption style={{ color: selectionne ? '#FFFFFF' : colors.textPrimary, fontWeight: '700' }}>
                  {date.getDate()}
                </Caption>
              </View>
            </Pressable>
          );
        })}
      </View>

      <TuileRepas
        label={t('planning.slot_midi')}
        repasPlanifie={repas.midi}
        ignore={repas.midiIgnore}
        onPress={() => onPressSlot(jourSelectionne, 'midi')}
        onIgnorer={() => onIgnorer(jourSelectionne, 'midi')}
      />
      <TuileRepas
        label={t('planning.slot_soir')}
        repasPlanifie={repas.soir}
        ignore={repas.soirIgnore}
        onPress={() => onPressSlot(jourSelectionne, 'soir')}
        onIgnorer={() => onIgnorer(jourSelectionne, 'soir')}
      />
    </View>
  );
}
