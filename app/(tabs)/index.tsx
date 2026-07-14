/** Accueil — résumé de la semaine, budget restant, économies du mois, promotions, CTA principal. */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { usePlanningStore } from '@/stores/planningStore';
import { useCoursesStore } from '@/stores/coursesStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Heading, Body, BodySm, Price, Savings, Caption } from '@/components/ui/Typography';
import { formatPrix } from '@/lib/format';
import { dates } from '@/lib/dates';
import { analytics } from '@/lib/analytics';

export default function Accueil() {
  const { colors } = useTheme();
  const profil = useProfilStore((s) => s.profil);
  const planning = usePlanningStore((s) => s.planning);
  const items = useCoursesStore((s) => s.items);
  const genererDepuisPlanning = useCoursesStore((s) => s.genererDepuisPlanning);

  const jourAujourdhui = dates.formatJour(dates.maintenant());
  const budgetHebdo = profil?.budget_hebdo ?? 150;
  const depenseEstimee = 0;
  const aCommence = items.length > 0;
  const budgetRestant = Math.max(0, budgetHebdo - depenseEstimee);
  const progression = Math.min(1, depenseEstimee / budgetHebdo);

  return (
    <ScreenScroll contentContainerStyle={{ gap: 20 }}>
      <View>
        <Caption style={{ textTransform: 'capitalize' }}>{jourAujourdhui}</Caption>
        <DisplayLG>Bonjour {profil?.prenom ?? 'toi'}, voici ta semaine</DisplayLG>
      </View>

      <Card style={{ padding: 18, gap: 10 }}>
        <Heading>Prochains repas</Heading>
        <Body>Midi : {planning.lundi.midi?.titre ?? 'Non planifié'}</Body>
        <Body>Soir : {planning.lundi.soir?.titre ?? 'Non planifié'}</Body>
      </Card>

      <Card style={{ padding: 18, gap: 12 }}>
        <Heading>Budget restant cette semaine</Heading>
        <Price>{formatPrix(budgetRestant)}</Price>
        <View style={{ height: 9, borderRadius: 999, backgroundColor: colors.bgSecondary, overflow: 'hidden' }}>
          <View
            style={{
              width: `${progression * 100}%`,
              height: '100%',
              backgroundColor: progression > 0.8 ? colors.warning : colors.primary,
            }}
          />
        </View>
        <BodySm>
          {aCommence
            ? `${formatPrix(depenseEstimee)} prévus sur ${formatPrix(budgetHebdo)}`
            : 'Ton budget est prêt. Génère une liste pour commencer à le suivre.'}
        </BodySm>
      </Card>

      <Card style={{ padding: 18, gap: 8 }}>
        <Heading>Économies réalisées ce mois</Heading>
        <Savings>{formatPrix(0)}</Savings>
        <BodySm>Les économies apparaîtront après ta première liste comparée.</BodySm>
      </Card>

      <Card style={{ padding: 18, gap: 8 }}>
        <Heading>Promotions du moment</Heading>
        <BodySm>Les promotions personnalisées arriveront quand tes enseignes favorites seront connectées.</BodySm>
      </Card>

      <Button
        label="Générer mes courses"
        onPress={() => {
          if (profil) genererDepuisPlanning(planning, profil);
          analytics.shoppingListGenerated(useCoursesStore.getState().items.length);
          router.push('/(tabs)/courses');
        }}
      />
    </ScreenScroll>
  );
}
