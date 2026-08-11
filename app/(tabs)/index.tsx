/** Accueil — refonte CoursIA inspiree du moodboard : salutation, semaine, inspirations. */
import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, ChefHat, TrendingDown, WalletCards } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { useCoursesStore } from '@/stores/coursesStore';
import { useBudgetSemaine } from '@/hooks/useBudgetSemaine';
import { useRepasSemaine } from '@/hooks/useRepasSemaine';
import { SemaineStrip } from '@/components/accueil/SemaineStrip';
import { InspirationsCarousel } from '@/components/accueil/InspirationsCarousel';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Heading, BodySm, Price, Savings, Caption } from '@/components/ui/Typography';
import { formatPrix } from '@/lib/format';
import { analytics } from '@/lib/analytics';
import { dates } from '@/lib/dates';
import { t } from '@/lib/i18n';

export default function Accueil() {
  const { colors } = useTheme();
  const profil = useProfilStore((s) => s.profil);
  // COUR-27 : Accueil montre toujours LA semaine en cours (pas de
  // navigation ici) — sa propre entree de cache, independante de celle que
  // l'onglet Planifier peut afficher a un instant donne.
  const { planning } = useRepasSemaine(profil?.id, dates.debutSemaine(dates.maintenant()));
  const genererDepuisPlanning = useCoursesStore((s) => s.genererDepuisPlanning);
  const { budgetConsomme, economiesCumulees } = useBudgetSemaine(profil?.id);
  const budgetHebdo = profil?.budget_hebdo ?? 150;
  const budgetRestant = Math.max(0, budgetHebdo - budgetConsomme);

  return (
    <ScreenScroll contentContainerStyle={{ width: '100%', maxWidth: 560, alignSelf: 'center', gap: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              borderCurve: 'continuous',
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChefHat size={20} color={colors.bg} strokeWidth={2} />
          </View>
          <Heading>CoursIA</Heading>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/profil')}
          accessibilityRole="button"
          accessibilityLabel={t('profil.notifications')}
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor: colors.bgSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View
        style={{
          gap: 8,
          padding: 20,
          borderRadius: 28,
          borderCurve: 'continuous',
          backgroundColor: colors.bgWarm,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <DisplayLG>
          {t('accueil.bonjour_emoji', { prenom: profil?.prenom || t('accueil.toi_par_defaut') })}
        </DisplayLG>
        <BodySm style={{ maxWidth: 310 }}>{t('accueil.question_semaine')}</BodySm>
      </View>

      <SemaineStrip planning={planning} />

      <Button
        label={t('accueil.generer_courses')}
        onPress={() => {
          if (profil) genererDepuisPlanning(planning, profil);
          analytics.shoppingListGenerated(useCoursesStore.getState().items.length);
          router.push('/(tabs)/courses');
        }}
      />

      <InspirationsCarousel profilId={profil?.id ?? 'demo-user'} />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, minHeight: 126, padding: 16, gap: 10 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              backgroundColor: colors.bgSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WalletCards size={17} color={colors.primary} />
          </View>
          <Caption>{t('accueil.budget_restant')}</Caption>
          <Price>{formatPrix(budgetRestant)}</Price>
        </Card>
        <Pressable
          onPress={() => router.push('/economies')}
          accessibilityRole="button"
          accessibilityLabel={t('accueil.economies_titre')}
          accessibilityHint={t('accueil.economies_hint')}
          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.72 : 1 })}
        >
          <Card style={{ flex: 1, minHeight: 126, padding: 16, gap: 10 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                backgroundColor: colors.swipePass,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingDown size={17} color={colors.savingsColor} />
            </View>
            <Caption>{t('accueil.economies_titre')}</Caption>
            <Savings>{formatPrix(economiesCumulees)}</Savings>
          </Card>
        </Pressable>
      </View>
    </ScreenScroll>
  );
}
