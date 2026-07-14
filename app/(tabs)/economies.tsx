/** Economies — budget consomme (donut), economies cumulees, enseigne la plus avantageuse, historique. */
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { DisplayLG, Heading, Body, BodySm, Savings, Caption, Price } from '@/components/ui/Typography';
import { formatPrix } from '@/lib/format';
import { dates } from '@/lib/dates';
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
  const { colors } = useTheme();
  const profil = useProfilStore((s) => s.profil);
  const [commandes, setCommandes] = useState<Commande[]>([]);

  useEffect(() => {
    if (!profil) return;
    supabase
      .from('commandes')
      .select('*')
      .eq('profil_id', profil.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setCommandes((data as Commande[] | null) ?? []));
  }, [profil]);

  const economiesCumulees = commandes.reduce((total, c) => total + c.economies, 0);
  const budgetConsomme = 62;
  const budgetHebdo = profil?.budget_hebdo ?? 150;

  if (commandes.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', paddingTop: 60 }}>
        <EmptyState
          illustration="economies"
          titre="Tes économies apparaîtront ici"
          sousTitre="Commence par valider ta première liste de courses."
        />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg, paddingTop: 60 }} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 100 }}>
      <DisplayLG>Économies</DisplayLG>

      <Card style={{ padding: 16, alignItems: 'center', gap: 12 }}>
        <DonutBudget progression={Math.min(1, budgetConsomme / budgetHebdo)} />
        <Body>{formatPrix(budgetConsomme)} consommés sur {formatPrix(budgetHebdo)}</Body>
      </Card>

      <Card style={{ padding: 16, gap: 6 }}>
        <Heading>Économies cumulées</Heading>
        <Savings style={{ fontSize: 32 }}>{formatPrix(economiesCumulees)}</Savings>
      </Card>

      <Card style={{ padding: 16, gap: 6 }}>
        <Heading>Enseigne la plus avantageuse ce mois</Heading>
        <Body>Lidl</Body>
      </Card>

      <View style={{ gap: 10 }}>
        <Heading>Dernières commandes</Heading>
        {commandes.map((c) => (
          <Card key={c.id} style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <BodySm>{dates.formatCourt(new Date(c.created_at))}</BodySm>
              <Caption>{c.paniers.length} enseignes</Caption>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Price>{formatPrix(c.montant_total)}</Price>
              <Savings>{formatPrix(c.economies)}</Savings>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}
