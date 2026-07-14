import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/lib/theme-context';
import { enseigneColors } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { Body, Price, Caption } from '@/components/ui/Typography';
import { formatPrix } from '@/lib/format';
import type { PanierEnseigne } from '@/types';

const NOM_ENSEIGNE: Record<string, string> = {
  coop: 'Coop',
  migros: 'Migros',
  lidl: 'Lidl',
  aldi: 'Aldi',
  ottos: 'Ottos',
  manor_food: 'Manor Food',
};

export function PanierEnseigneCard({ panier }: { panier: PanierEnseigne }) {
  const { colors } = useTheme();
  return (
    <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: enseigneColors[panier.enseigne] }} />
        <View>
          <Body>{NOM_ENSEIGNE[panier.enseigne] ?? panier.enseigne}</Body>
          <Caption>{panier.produits.length} produits</Caption>
        </View>
      </View>
      <Price style={{ color: colors.primary }}>{formatPrix(panier.montant)}</Price>
    </Card>
  );
}
