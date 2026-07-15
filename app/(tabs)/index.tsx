/** Accueil — refonte Coursia inspiree du moodboard : salutation, semaine, inspirations. */
import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, ChefHat } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { usePlanningStore } from '@/stores/planningStore';
import { useCoursesStore } from '@/stores/coursesStore';
import { useBudgetSemaine } from '@/hooks/useBudgetSemaine';
import { SemaineStrip } from '@/components/accueil/SemaineStrip';
import { InspirationsCarousel } from '@/components/accueil/InspirationsCarousel';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Heading, BodySm, Price, Savings, Caption } from '@/components/ui/Typography';
import { formatPrix } from '@/lib/format';
import { analytics } from '@/lib/analytics';
import { t } from '@/lib/i18n';

export default function Accueil() {
  const { colors } = useTheme();
  const profil = useProfilStore((s) => s.profil);
  const planning = usePlanningStore((s) => s.planning);
  const genererDepuisPlanning = useCoursesStore((s) => s.genererDepuisPlanning);
  const { budgetConsomme, economiesCumulees } = useBudgetSemaine(profil?.id);
  const budgetHebdo = profil?.budget_hebdo ?? 150;
  const budgetRestant = Math.max(0, budgetHebdo - budgetConsomme);

  return (
    <ScreenScroll contentContainerStyle={{ gap: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ChefHat size={22} color={colors.primaryDark} />
          <Heading style={{ letterSpacing: 0.5 }}>COURSIA</Heading>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/profil')}
          accessibilityRole="button"
          accessibilityLabel={t('profil.notifications')}
          hitSlop={8}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Bell size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={{ gap: 4 }}>
        <DisplayLG>{t('accueil.bonjour_emoji')}</DisplayLG>
        <BodySm>{t('accueil.question_semaine')}</BodySm>
      </View>

      <SemaineStrip planning={planning} />

      <InspirationsCarousel profilId={profil?.id ?? 'demo-user'} />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, padding: 16, gap: 6, borderRadius: 20, borderTopLeftRadius: 20 }}>
          <Caption>{t('accueil.budget_restant')}</Caption>
          <Price>{formatPrix(budgetRestant)}</Price>
        </Card>
        <Card style={{ flex: 1, padding: 16, gap: 6, borderRadius: 20, borderTopLeftRadius: 20 }}>
          <Caption>{t('accueil.economies_titre')}</Caption>
          <Savings>{formatPrix(economiesCumulees)}</Savings>
        </Card>
      </View>

      <Button
        label={t('accueil.generer_courses')}
        onPress={() => {
          if (profil) genererDepuisPlanning(planning, profil);
          analytics.shoppingListGenerated(useCoursesStore.getState().items.length);
          router.push('/(tabs)/courses');
        }}
      />
    </ScreenScroll>
  );
}
