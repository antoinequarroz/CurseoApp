/**
 * Bandeau "Ma semaine" de l'accueil (refonte Coursia) — une pastille par jour
 * (L M M J V S D), pleine si un repas est planifie ce jour-la, avec un lien
 * vers le planning complet. Inspire du moodboard fourni par le produit.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { Card } from '@/components/ui/Card';
import { Subheading, Caption, BodySm } from '@/components/ui/Typography';
import { dates } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { JOURS_SEMAINE, type PlanningHebdomadaire } from '@/types';

const INITIALES: Record<string, string> = {
  lundi: 'L',
  mardi: 'M',
  mercredi: 'M',
  jeudi: 'J',
  vendredi: 'V',
  samedi: 'S',
  dimanche: 'D',
};

export function SemaineStrip({ planning }: { planning: PlanningHebdomadaire }) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const jourActuel = dates.jourSemaine(dates.maintenant());
  const debutSemaine = dates.debutSemaine(dates.maintenant());
  const finSemaine = new Date(debutSemaine);
  finSemaine.setDate(finSemaine.getDate() + 6);
  const periode = `${dates.formatCourt(debutSemaine)} – ${dates.formatCourt(finSemaine)}`;

  const ouvrirPlanning = () => {
    void haptics.selection();
    router.push('/(tabs)/planifier');
  };

  return (
    <Card style={{ padding: 18, gap: 14, borderRadius: 26, borderTopLeftRadius: 26 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Caption>{t('accueil.ma_semaine')}</Caption>
          <Subheading>{periode}</Subheading>
        </View>
        <Pressable
          onPress={ouvrirPlanning}
          accessibilityRole="button"
          accessibilityLabel={t('accueil.modifier')}
          hitSlop={8}
        >
          <BodySm style={{ color: colors.primary }}>{t('accueil.modifier')}</BodySm>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {JOURS_SEMAINE.map((jour) => {
          const repas = planning[jour];
          const aUnRepas = Boolean(repas.midi || repas.soir);
          const estAujourdhui = jour === jourActuel;
          return (
            <Pressable
              key={jour}
              onPress={ouvrirPlanning}
              accessibilityRole="button"
              accessibilityLabel={t('accueil.jour_planifie', { jour: t(`planning.jour_${jour}`), statut: aUnRepas ? t('accueil.planifie') : t('accueil.non_planifie') })}
              style={{ alignItems: 'center', gap: 6 }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: aUnRepas ? colors.primary : colors.bgSecondary,
                  borderWidth: estAujourdhui && !aUnRepas ? 1.5 : 0,
                  borderColor: colors.primary,
                }}
              >
                <Caption style={{ color: aUnRepas ? '#FFFFFF' : colors.textMuted, fontWeight: '700' }}>
                  {INITIALES[jour]}
                </Caption>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={ouvrirPlanning}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 4 }}
      >
        <BodySm style={{ color: colors.primary }}>{t('accueil.voir_plan_semaine')}</BodySm>
        <ChevronRight size={16} color={colors.primary} />
      </Pressable>
    </Card>
  );
}
