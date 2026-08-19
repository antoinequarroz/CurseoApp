/** Contexte compact du repas rempli directement depuis le swipe. */
import React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { BodySm, Caption, Subheading } from '@/components/ui/Typography';
import { dates } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { JOURS_SEMAINE, type JourSemaine, type PlanningHebdomadaire } from '@/types';

export type SelectionRepas = { jour: JourSemaine; moment: 'midi' | 'soir' };

const LETTRE_JOUR: Record<JourSemaine, string> = {
  lundi: 'L',
  mardi: 'M',
  mercredi: 'M',
  jeudi: 'J',
  vendredi: 'V',
  samedi: 'S',
  dimanche: 'D',
};

export function SelecteurRepasSwipe({
  planning,
  semaineDebut,
  selection,
  portions,
  onSelectionChange,
  onPortionsChange,
  onIgnorer,
  onChangerSemaine,
}: {
  planning: PlanningHebdomadaire;
  semaineDebut: Date;
  selection: SelectionRepas;
  portions: number;
  onSelectionChange: (selection: SelectionRepas) => void;
  onPortionsChange: (portions: number) => void;
  onIgnorer: () => void;
  onChangerSemaine: (delta: number) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const repasSelectionne = planning[selection.jour][selection.moment];
  const finSemaine = dates.finSemaine(semaineDebut);
  const periode = `${dates.formatCourt(semaineDebut)} – ${dates.formatCourt(finSemaine)}`;

  const choisir = (nouvelleSelection: SelectionRepas) => {
    void haptics.selection();
    onSelectionChange(nouvelleSelection);
  };

  return (
    <View
      accessibilityRole="summary"
      style={{ padding: 12, gap: 10, borderRadius: 20, backgroundColor: colors.bgWarm }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => onChangerSemaine(-1)}
          accessibilityRole="button"
          accessibilityLabel={t('planning.semaine_precedente')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} color={colors.textPrimary} accessible={false} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Caption>{t('planning.repas_en_cours')}</Caption>
          <Subheading>{periode}</Subheading>
        </View>
        <Pressable
          onPress={() => onChangerSemaine(1)}
          accessibilityRole="button"
          accessibilityLabel={t('planning.semaine_suivante')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronRight size={20} color={colors.textPrimary} accessible={false} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {JOURS_SEMAINE.map((jour) => {
          const actif = jour === selection.jour;
          const date = dates.dateDuJour(semaineDebut, jour);
          const jourPlanifie = planning[jour];
          const complet = Boolean((jourPlanifie.midi || jourPlanifie.midiIgnore) && (jourPlanifie.soir || jourPlanifie.soirIgnore));
          return (
            <Pressable
              key={jour}
              onPress={() => choisir({ ...selection, jour })}
              accessibilityRole="button"
              accessibilityLabel={`${t(`planning.jour_${jour}`)} ${date.getDate()}`}
              accessibilityState={{ selected: actif }}
              accessibilityHint={complet ? t('planning.jour_deja_decide') : undefined}
              style={{ minWidth: 40, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2 }}
            >
              <Caption style={{ color: actif ? colors.primary : colors.textMuted }}>{LETTRE_JOUR[jour]}</Caption>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: actif ? colors.primary : 'transparent',
                  borderWidth: actif || !complet ? 0 : 1,
                  borderColor: colors.primaryLight,
                }}
              >
                <Caption style={{ color: actif ? '#FFFFFF' : colors.textPrimary, fontWeight: '700' }}>
                  {date.getDate()}
                </Caption>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', padding: 3, borderRadius: 14, backgroundColor: colors.bgSecondary }}>
          {(['midi', 'soir'] as const).map((moment) => {
            const actif = selection.moment === moment;
            return (
              <Pressable
                key={moment}
                onPress={() => choisir({ ...selection, moment })}
                accessibilityRole="button"
                accessibilityState={{ selected: actif }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: actif ? colors.bgCard : 'transparent',
                }}
              >
                <BodySm style={{ color: colors.textPrimary, fontWeight: '600' }}>{t(`planning.slot_${moment}`)}</BodySm>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: colors.bgSecondary }}>
          <Pressable
            onPress={() => onPortionsChange(Math.max(1, portions - 1))}
            accessibilityRole="button"
            accessibilityLabel={t('planning.retirer_une_portion')}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Minus size={17} color={colors.textPrimary} accessible={false} />
          </Pressable>
          <BodySm accessibilityLabel={t('planning.nombre_portions', { count: portions })} style={{ minWidth: 22, textAlign: 'center', fontWeight: '700' }}>
            {portions}
          </BodySm>
          <Pressable
            onPress={() => onPortionsChange(Math.min(20, portions + 1))}
            accessibilityRole="button"
            accessibilityLabel={t('planning.ajouter_une_portion')}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={17} color={colors.textPrimary} accessible={false} />
          </Pressable>
        </View>
      </View>

      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Caption style={{ flex: 1 }} numberOfLines={1}>
          {repasSelectionne
            ? t('planning.remplacera_recette', { titre: repasSelectionne.recette.titre })
            : t('planning.swipe_consigne')}
        </Caption>
        <Pressable
          testID="planning-skip-meal"
          onPress={onIgnorer}
          accessibilityRole="button"
          accessibilityLabel={t('planning.rien_prevu_bouton')}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}
        >
          <BodySm style={{ color: colors.primary, fontWeight: '600' }}>{t('planning.ne_rien_prevoir')}</BodySm>
        </Pressable>
      </View>
    </View>
  );
}
