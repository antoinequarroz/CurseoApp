/** Accueil — resume de la semaine, budget restant, economies du mois, promotions, CTA principal. */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { usePlanningStore } from '@/stores/planningStore';
import { useCoursesStore } from '@/stores/coursesStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DisplayLG, Heading, Body, BodySm, Price, Savings, Caption } from '@/components/ui/Typography';
import { formatPrix } from '@/lib/format';
import { dates } from '@/lib/dates';
import { analytics } from '@/lib/analytics';

export default function Accueil() {
  const { colors } = useTheme();
  const profil = useProfilStore((s) => s.profil);
  const planning = usePlanningStore((s) => s.planning);
  const genererDepuisPlanning = useCoursesStore((s) => s.genererDepuisPlanning);

  const jourAujourdhui = dates.formatJour(dates.maintenant());
  const budgetHebdo = profil?.budget_hebdo ?? 150;
  const depenseEstimee = 62; // MVP : calcul simplifie, a affiner avec l'historique des commandes
  const budgetRestant = Math.max(0, budgetHebdo - depenseEstimee);
  const progression = Math.min(1, depenseEstimee / budgetHebdo);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 100 }}>
      <View>
        <DisplayLG>Bonjour {profil?.prenom ?? 'toi'}, voici ta semaine</DisplayLG>
        <Caption style={{ textTransform: 'capitalize' }}>{jourAujourdhui}</Caption>
      </View>

      <Card style={{ padding: 16, gap: 8 }}>
        <Heading>Prochains repas</Heading>
        <Body>Midi : {planning.lundi.midi?.titre ?? 'Non planifié'}</Body>
        <Body>Soir : {planning.lundi.soir?.titre ?? 'Non planifié'}</Body>
      </Card>

      <Card style={{ padding: 16, gap: 10 }}>
        <Heading>Budget restant cette semaine</Heading>
        <Price>{formatPrix(budgetRestant)}</Price>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bgSecondary, overflow: 'hidden' }}>
          <View style={{ width: `${progression * 100}%`, height: '100%', backgroundColor: progression > 0.8 ? colors.warning : colors.primary }} />
        </View>
        <BodySm>{formatPrix(depenseEstimee)} dépensés sur {formatPrix(budgetHebdo)}</BodySm>
      </Card>

      <Card style={{ padding: 16, gap: 6 }}>
        <Heading>Économies réalisées ce mois</Heading>
        <Savings>{formatPrix(38.4)}</Savings>
      </Card>

      <Card style={{ padding: 16, gap: 6 }}>
        <Heading>Promotions du moment</Heading>
        <BodySm>-20% sur les pâtes chez Lidl cette semaine</BodySm>
      </Card>

      <Button
        label="Générer mes courses"
        onPress={() => {
          if (profil) genererDepuisPlanning(planning, profil);
          analytics.shoppingListGenerated(useCoursesStore.getState().items.length);
          router.push('/(tabs)/courses');
        }}
      />
    </ScrollView>
  );
}
