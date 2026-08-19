import React from 'react';
import { Pressable, View } from 'react-native';
import { Check, PackageSearch } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenScroll } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Body, BodySm, Caption, DisplayLG, Price } from '@/components/ui/Typography';
import { useTheme } from '@/lib/theme-context';
import { rechercherProduitsLive, type ProduitRechercheLive } from '@/lib/swissGroceriesRepository';
import { usePanierLiveStore } from '@/stores/panierLiveStore';
import { formatPrix } from '@/lib/format';
import { t } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';

const NOMS_ENSEIGNES: Record<string, string> = {
  migros: 'Migros',
  coop: 'Coop',
  aldi: 'Aldi',
  lidl: 'Lidl',
  ottos: "Otto's",
};

export default function RemplacerProduit() {
  const { colors } = useTheme();
  const { ligneId, demande } = useLocalSearchParams<{ ligneId?: string; demande?: string }>();
  const remplacerArticle = usePanierLiveStore((state) => state.remplacerArticle);
  const recherche = useQuery({
    queryKey: ['swissgroceries', 'remplacement', demande],
    queryFn: () => rechercherProduitsLive(demande!),
    enabled: Boolean(demande),
    staleTime: 60_000,
  });
  const produits: ProduitRechercheLive[] = recherche.data ?? [];

  const choisir = (produit: ProduitRechercheLive) => {
    if (!ligneId) return;
    remplacerArticle(ligneId, produit);
    router.back();
  };

  return (
    <ScreenScroll tabBar={false} contentContainerStyle={{ gap: 18 }}>
      <View style={{ gap: 5 }}>
        <DisplayLG>{t('checkout.remplacer_titre')}</DisplayLG>
        <Body>{t('checkout.remplacer_description', { produit: demande ?? '' })}</Body>
      </View>
      {recherche.isLoading ? (
        <Card style={{ padding: 24, alignItems: 'center', gap: 10 }}>
          <PackageSearch size={28} color={colors.primary} accessible={false} />
          <BodySm accessibilityLiveRegion="polite">{t('checkout.recherche_produits')}</BodySm>
        </Card>
      ) : null}
      {recherche.isError || !demande ? (
        <Card style={{ padding: 18, gap: 12 }}>
          <BodySm accessibilityRole="alert">{t('checkout.recherche_erreur')}</BodySm>
          <Button
            variant="secondary"
            label={t('commun.reessayer')}
            onPress={() => void recherche.refetch()}
          />
        </Card>
      ) : null}
      {!recherche.isLoading && !recherche.isError && produits.length === 0 ? (
        <Body>{t('checkout.recherche_vide')}</Body>
      ) : null}
      {produits.map((produit) => (
        <Pressable
          key={`${produit.enseigne}:${produit.id}`}
          onPress={() => choisir(produit)}
          accessibilityRole="button"
          accessibilityLabel={t('checkout.choisir_produit_label', {
            produit: produit.nom,
            enseigne: NOMS_ENSEIGNES[produit.enseigne] ?? produit.enseigne,
            prix: formatPrix(produit.prix),
          })}
        >
          <Card style={{ minHeight: 76, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <BodySm style={{ fontWeight: '700' }}>{produit.nom}</BodySm>
              <Caption>
                {[NOMS_ENSEIGNES[produit.enseigne], produit.marque, produit.format]
                  .filter(Boolean)
                  .join(' · ')}
              </Caption>
            </View>
            <Price>{formatPrix(produit.prix)}</Price>
            <Check size={18} color={colors.primary} accessible={false} />
          </Card>
        </Pressable>
      ))}
    </ScreenScroll>
  );
}
