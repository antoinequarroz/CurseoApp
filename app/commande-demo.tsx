import React from 'react';
import { View } from 'react-native';
import { CheckCircle2, ShoppingBag } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenScroll } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Body, BodySm, Caption, DisplayLG, Heading, PriceLG } from '@/components/ui/Typography';
import { useTheme } from '@/lib/theme-context';
import { sousTotalPanier, usePanierLiveStore } from '@/stores/panierLiveStore';
import { formatPrix } from '@/lib/format';
import { t } from '@/lib/i18n';
import { useProfilStore } from '@/stores/profilStore';
import { fetchCommandeDemo } from '@/lib/commandesDemoRepository';
import { dates } from '@/lib/dates';

const NOMS_ENSEIGNES: Record<string, string> = {
  migros: 'Migros',
  coop: 'Coop',
  aldi: 'Aldi',
  lidl: 'Lidl',
  ottos: "Otto's",
};

export default function CommandeDemo() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ commandeId?: string; reference?: string; montant?: string }>();
  const profil = useProfilStore((state) => state.profil);
  const brouillon = usePanierLiveStore((state) => state.brouillon);
  const reprendre = usePanierLiveStore((state) => state.reprendreDepuisCommande);
  const reset = usePanierLiveStore((state) => state.reset);
  const commandeQuery = useQuery({
    queryKey: ['commande-demo', params.commandeId, profil?.id],
    queryFn: () => fetchCommandeDemo(params.commandeId!, profil!.id),
    enabled: Boolean(params.commandeId && profil),
  });
  const commande = commandeQuery.data;
  const paniers =
    commande?.paniers.map((panier) => ({
      enseigne: panier.enseigne,
      articles: panier.articles,
      montant: panier.montant,
      referenceSimulation: panier.referenceSimulation,
      creneau: commande.livraisons.find((livraison) => livraison.enseigne === panier.enseigne)?.creneau,
    })) ??
    brouillon?.paniers.map((panier) => ({
      ...panier,
      montant: sousTotalPanier(panier),
      referenceSimulation: undefined,
      creneau: brouillon.livraisons.find((livraison) => livraison.enseigne === panier.enseigne)?.creneau,
    })) ??
    [];

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
        <Heading selectable>
          {commande?.reference ?? params.reference ?? t('checkout.reference_indisponible')}
        </Heading>
        {commande || params.montant ? (
          <PriceLG>{formatPrix(commande?.montantTotal ?? Number(params.montant))}</PriceLG>
        ) : null}
      </Card>

      {paniers.map((panier) => (
        <Card key={panier.enseigne} style={{ padding: 18, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ShoppingBag size={20} color={colors.primary} accessible={false} />
            <Heading style={{ flex: 1 }}>{NOMS_ENSEIGNES[panier.enseigne] ?? panier.enseigne}</Heading>
            <BodySm>{formatPrix(panier.montant)}</BodySm>
          </View>
          <Caption>{t('checkout.articles_count', { count: panier.articles.length })}</Caption>
          {panier.creneau ? (
            <Caption>
              {t('checkout.creneau_confirme', {
                date: dates.formatDateHeureCourte(new Date(panier.creneau.debut)),
              })}
            </Caption>
          ) : null}
          {panier.referenceSimulation ? <Caption selectable>{panier.referenceSimulation}</Caption> : null}
          <BodySm style={{ color: colors.chipTextWarning }}>{t('checkout.non_transmise')}</BodySm>
        </Card>
      ))}

      {commande?.reprenable ? (
        <Button
          variant="secondary"
          label={t('historique_demo.reprendre')}
          onPress={() => {
            reprendre(commande);
            router.replace('/panier-en-ligne');
          }}
        />
      ) : null}

      <Button label={t('checkout.terminer_demo')} onPress={terminer} />
    </ScreenScroll>
  );
}
