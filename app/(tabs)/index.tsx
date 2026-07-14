/** Accueil — tableau de bord chaleureux et orienté action. */
import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CalendarDays, ChefHat, ShoppingBasket, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { usePlanningStore } from '@/stores/planningStore';
import { useCoursesStore } from '@/stores/coursesStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Heading, Body, BodySm, PriceXL, SavingsXL, Caption } from '@/components/ui/Typography';
import { formatPrix } from '@/lib/format';
import { dates } from '@/lib/dates';
import { analytics } from '@/lib/analytics';
import { t } from '@/lib/i18n';

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'primary' | 'neutral';
}) {
  const { colors } = useTheme();
  return (
    <Card style={{ flex: 1, padding: 16, gap: 10, borderTopLeftRadius: 18 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: tone === 'primary' ? colors.primary : colors.bgSecondary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Caption>{label}</Caption>
      <Heading>{value}</Heading>
    </Card>
  );
}

export default function Accueil() {
  const { colors, isDark } = useTheme();
  const profil = useProfilStore((s) => s.profil);
  const planning = usePlanningStore((s) => s.planning);
  const items = useCoursesStore((s) => s.items);
  const genererDepuisPlanning = useCoursesStore((s) => s.genererDepuisPlanning);

  const jourAujourdhui = dates.formatJour(dates.maintenant());
  const budgetHebdo = profil?.budget_hebdo ?? 150;
  const budgetRestant = budgetHebdo;
  const repasPlanifies = Object.values(planning).reduce(
    (total, jour) => total + (jour.midi ? 1 : 0) + (jour.soir ? 1 : 0),
    0,
  );

  return (
    <ScreenScroll contentContainerStyle={{ gap: 24 }}>
      <View style={{ gap: 8 }}>
        <Caption style={{ textTransform: 'capitalize' }}>{jourAujourdhui}</Caption>
        <DisplayLG>{t('accueil.bonjour', { prenom: profil?.prenom ?? t('accueil.toi') })}</DisplayLG>
        <BodySm>{t('accueil.sous_titre')}</BodySm>
      </View>

      <Card style={{ borderRadius: 30, borderTopLeftRadius: 30, overflow: 'hidden' }}>
        <View style={{ height: 210 }}>
          <Image
            source={require('@/assets/home-hero-courseo.png')}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
            style={{ width: '100%', height: '100%' }}
          />
          <LinearGradient
            colors={isDark ? ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)'] : ['rgba(255,255,255,0)', 'rgba(27,67,50,0.48)']}
            style={{ position: 'absolute', inset: 0 }}
          />
          <View style={{ position: 'absolute', left: 18, right: 18, bottom: 18, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#FFFFFF" />
              <Caption style={{ color: 'rgba(255,255,255,0.86)' }}>{t('accueil.hero_badge')}</Caption>
            </View>
            <Heading style={{ color: '#FFFFFF' }}>{t('accueil.hero_titre')}</Heading>
          </View>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard
          icon={<CalendarDays size={18} color="#FFFFFF" />}
          label={t('accueil.repas_planifies')}
          value={`${repasPlanifies}/14`}
          tone="primary"
        />
        <StatCard
          icon={<ShoppingBasket size={18} color={colors.textPrimary} />}
          label={t('accueil.articles')}
          value={`${items.length}`}
        />
      </View>

      <Card style={{ padding: 20, gap: 14, borderRadius: 24, borderTopLeftRadius: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ChefHat size={22} color={colors.primary} />
          <Heading>{t('accueil.prochains_repas')}</Heading>
        </View>
        <View style={{ gap: 8 }}>
          <Body>{t('accueil.midi', { titre: planning.lundi.midi?.titre ?? t('accueil.non_planifie') })}</Body>
          <Body>{t('accueil.soir', { titre: planning.lundi.soir?.titre ?? t('accueil.non_planifie') })}</Body>
        </View>
      </Card>

      <Card style={{ padding: 20, gap: 12, borderRadius: 24, borderTopLeftRadius: 24 }}>
        <Heading>{t('accueil.budget_restant')}</Heading>
        <PriceXL>{formatPrix(budgetRestant)}</PriceXL>
        <View style={{ height: 9, borderRadius: 999, backgroundColor: colors.bgSecondary, overflow: 'hidden' }}>
          <View style={{ width: '0%', height: '100%', backgroundColor: colors.primary }} />
        </View>
        <BodySm>{t('accueil.budget_message')}</BodySm>
      </Card>

      <Card style={{ padding: 20, gap: 8, borderRadius: 24, borderTopLeftRadius: 24 }}>
        <Heading>{t('accueil.economies_titre')}</Heading>
        <SavingsXL>{formatPrix(0)}</SavingsXL>
        <BodySm>{t('accueil.economies_message')}</BodySm>
      </Card>

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
