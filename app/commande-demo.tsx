import React from 'react';
import { View } from 'react-native';
import { CheckCircle2, ShoppingBag } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenScroll } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Body, BodySm, Caption, DisplayLG, Heading, PriceLG } from '@/components/ui/Typography';
import { useTheme } from '@/lib/theme-context';
import { sousTotalPanier, usePanierLiveStore } from '@/stores/panierLiveStore';
import { formatPrix } from '@/lib/format';
import { t } from '@/lib/i18n';

const NOMS_ENSEIGNES: Record<string, string> = {
  migros: 'Migros',
  coop: 'Coop',
  aldi: 'Aldi',
  lidl: 'Lidl',
  ottos: "Otto's",
};

export default function CommandeDemo() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ reference?: string; montant?: string }>();
  const brouillon = usePanierLiveStore((state) => state.brouillon);
  const reset = usePanierLiveStore((state) => state.reset);

  const terminer = () => {
    reset();
    router.replace('/(tabs)/courses');
  };

  return (
    <ScreenScroll tabBar={false} contentContainerStyle={{ gap: 20 }}>
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.bgSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle2 size={38} color={colors.primary} accessible={false} />
        </View>
        <Badge label={t('checkout.badge_demo')} variant="warning" />
        <DisplayLG style={{ textAlign: 'center' }}>{t('checkout.confirmation_titre')}</DisplayLG>
        <Body style={{ textAlign: 'center' }}>{t('checkout.confirmation_description')}</Body>
      </View>

      <Card style={{ padding: 18, gap: 8 }}>
        <Caption>{t('checkout.reference_demo')}</Caption>
        <Heading selectable>{params.reference ?? t('checkout.reference_indisponible')}</Heading>
        {params.montant ? <PriceLG>{formatPrix(Number(params.montant))}</PriceLG> : null}
      </Card>

      {brouillon?.paniers.map((panier) => (
        <Card key={panier.enseigne} style={{ padding: 18, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ShoppingBag size={20} color={colors.primary} accessible={false} />
            <Heading style={{ flex: 1 }}>{NOMS_ENSEIGNES[panier.enseigne] ?? panier.enseigne}</Heading>
            <BodySm>{formatPrix(sousTotalPanier(panier))}</BodySm>
          </View>
          <Caption>{t('checkout.articles_count', { count: panier.articles.length })}</Caption>
          <BodySm style={{ color: colors.chipTextWarning }}>{t('checkout.non_transmise')}</BodySm>
        </Card>
      ))}

      <Button label={t('checkout.terminer_demo')} onPress={terminer} />
    </ScreenScroll>
  );
}
