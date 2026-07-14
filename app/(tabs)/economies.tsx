/** Économies — budget consommé, économies cumulées, enseigne la plus avantageuse, historique. */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonComparateur } from '@/components/ui/Skeleton';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Heading, Body, BodySm, Savings, SavingsXL, Caption, Price } from '@/components/ui/Typography';
import { formatPrix } from '@/lib/format';
import { dates } from '@/lib/dates';
import { t } from '@/lib/i18n';
import type { Commande } from '@/types';

function DonutBudget({ progression }: { progression: number }) {
  const { colors } = useTheme();
  const taille = 140;
  const rayon = 55;
  const circonference = 2 * Math.PI * rayon;

  return (
    <Svg width={taille} height={taille}>
      <Circle cx={taille / 2} cy={taille / 2} r={rayon} stroke={colors.bgSecondary} strokeWidth={14} fill="none" />
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
  const profil = useProfilStore((s) => s.profil);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profil) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    void (async () => {
      try {
        const { data } = await supabase
          .from('commandes')
          .select('*')
          .eq('profil_id', profil.id)
          .order('created_at', { ascending: false })
          .limit(5);
        setCommandes((data as Commande[] | null) ?? []);
      } catch {
        setCommandes([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [profil]);

  const economiesCumulees = commandes.reduce((total, c) => total + c.economies, 0);
  const budgetConsomme = commandes.reduce((total, c) => total + c.montant_total, 0);
  const budgetHebdo = profil?.budget_hebdo ?? 150;

  if (isLoading) {
    return (
      <ScreenScroll contentContainerStyle={{ gap: 20 }}>
        <DisplayLG>{t('tabs.economies')}</DisplayLG>
        <SkeletonComparateur />
      </ScreenScroll>
    );
  }

  if (commandes.length === 0) {
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

      <Card style={{ padding: 18, gap: 6 }}>
        <Heading>{t('economies.enseigne_avantageuse')}</Heading>
        <Body>{t('economies.enseigne_avantageuse_indisponible')}</Body>
      </Card>

      <View style={{ gap: 10 }}>
        <Heading>{t('economies.dernieres_commandes')}</Heading>
        {commandes.map((c) => (
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
