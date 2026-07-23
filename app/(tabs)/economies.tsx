/** Économies — budget consommé, économies cumulées, enseigne la plus avantageuse, historique. */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { useBudgetSemaine } from '@/hooks/useBudgetSemaine';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonComparateur } from '@/components/ui/Skeleton';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Heading, Body, BodySm, Savings, SavingsXL, Caption, Price } from '@/components/ui/Typography';
import { formatPrix } from '@/lib/format';
import { dates } from '@/lib/dates';
import { enseigneColors } from '@/lib/theme';
import { t } from '@/lib/i18n';

const NOM_ENSEIGNE: Record<string, string> = {
  coop: t('onboarding.enseigne_coop'),
  migros: t('onboarding.enseigne_migros'),
  lidl: t('onboarding.enseigne_lidl'),
  aldi: t('onboarding.enseigne_aldi'),
  ottos: t('onboarding.enseigne_ottos'),
  manor_food: t('onboarding.enseigne_manor_food'),
};

function DonutBudget({ progression }: { progression: number }) {
  const { colors } = useTheme();
  const taille = 140;
  const rayon = 55;
  const circonference = 2 * Math.PI * rayon;

  return (
    <Svg width={taille} height={taille}>
      <Circle cx={taille / 2} cy={taille / 2} r={rayon} stroke={colors.accent} strokeWidth={14} fill="none" />
      <Circle
        cx={taille / 2}
        cy={taille / 2}
        r={rayon}
        stroke={colors.primary}
        strokeWidth={14}
        fill="none"
        strokeDasharray={`${circonference * progression} ${circonference}`}
        strokeLinecap="round"
        rotation={-90}
        origin={`${taille / 2}, ${taille / 2}`}
      />
    </Svg>
  );
}

export default function Economies() {
  const { colors } = useTheme();
  const profil = useProfilStore((s) => s.profil);
  const { isLoading, budgetConsomme, economiesCumulees, dernieresCommandes, meilleureEnseigne, aDesCommandes } =
    useBudgetSemaine(profil?.id);
  const budgetHebdo = profil?.budget_hebdo ?? 150;

  if (isLoading) {
    return (
      <ScreenScroll contentContainerStyle={{ gap: 20 }}>
        <DisplayLG>{t('tabs.economies')}</DisplayLG>
        <SkeletonComparateur />
      </ScreenScroll>
    );
  }

  if (!aDesCommandes) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <EmptyState
          illustration="economies"
          titre={t('economies.empty_titre')}
          sousTitre={t('economies.empty_soustitre')}
        />
      </Screen>
    );
  }

  return (
    <ScreenScroll contentContainerStyle={{ gap: 20 }}>
      <DisplayLG>{t('tabs.economies')}</DisplayLG>

      <Card style={{ padding: 18, alignItems: 'center', gap: 12 }}>
        <DonutBudget progression={Math.min(1, budgetConsomme / budgetHebdo)} />
        <Body>{t('economies.budget_suivi', { consomme: formatPrix(budgetConsomme), budget: formatPrix(budgetHebdo) })}</Body>
      </Card>

      <Card style={{ padding: 18, gap: 6 }}>
        <Heading>{t('economies.economies_cumulees')}</Heading>
        <SavingsXL>{formatPrix(economiesCumulees)}</SavingsXL>
      </Card>

      <Card style={{ padding: 18, gap: 10 }}>
        <Heading>{t('economies.enseigne_avantageuse')}</Heading>
        {meilleureEnseigne ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              alignSelf: 'flex-start',
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 9999,
              backgroundColor: colors.bgSecondary,
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: enseigneColors[meilleureEnseigne] }} />
            <Body style={{ fontWeight: '600' }}>{NOM_ENSEIGNE[meilleureEnseigne] ?? meilleureEnseigne}</Body>
          </View>
        ) : (
          <Body>{t('economies.enseigne_avantageuse_indisponible')}</Body>
        )}
      </Card>

      <View style={{ gap: 10 }}>
        <Heading>{t('economies.dernieres_commandes')}</Heading>
        {dernieresCommandes.map((c) => (
          <Card key={c.id} style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <BodySm>{dates.formatCourt(new Date(c.created_at))}</BodySm>
              <Caption>{t('economies.enseignes_count', { count: c.paniers.length })}</Caption>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Price>{formatPrix(c.montant_total)}</Price>
              <Savings>{formatPrix(c.economies)}</Savings>
            </View>
          </Card>
        ))}
      </View>
    </ScreenScroll>
  );
}
