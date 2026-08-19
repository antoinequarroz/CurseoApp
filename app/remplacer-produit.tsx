import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, PackageSearch } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenScroll } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Body, BodySm, Caption, DisplayLG, Price } from '@/components/ui/Typography';
import { useTheme } from '@/lib/theme-context';
import { rechercherProduitsLive, type ProduitRechercheLive } from '@/lib/swissGroceriesRepository';
import { trouverLignePanier, usePanierLiveStore } from '@/stores/panierLiveStore';
import { formatPrix } from '@/lib/format';
import { t } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import { usePreferencesCourses } from '@/hooks/usePreferencesCourses';
import { useProfilStore } from '@/stores/profilStore';
import { Badge } from '@/components/ui/Badge';
import { comparerSubstitution } from '@/lib/correspondanceProduit';

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
  const brouillon = usePanierLiveStore((state) => state.brouillon);
  const remplacerArticle = usePanierLiveStore((state) => state.remplacerArticle);
  const source = trouverLignePanier(brouillon, ligneId);
  const profil = useProfilStore((state) => state.profil);
  const preferences = usePreferencesCourses(profil?.id);
  const recherche = useQuery({
    queryKey: ['swissgroceries', 'remplacement', demande, preferences.data],
    queryFn: () => rechercherProduitsLive(demande!, preferences.data),
    enabled: Boolean(demande),
    staleTime: 60_000,
  });
  const produits: ProduitRechercheLive[] = recherche.data ?? [];
  const [selection, setSelection] = useState<ProduitRechercheLive | null>(null);

  const confirmer = () => {
    if (!ligneId || !selection) return;
    remplacerArticle(ligneId, selection);
    router.back();
  };
  const comparaison =
    source && selection
      ? comparerSubstitution({ ...source.ligne, enseigne: source.enseigne }, selection)
      : null;
  const depasseVariationPreferee = Boolean(
    comparaison &&
    comparaison.ecartMontant > 0 &&
    comparaison.ancienMontant > 0 &&
    (comparaison.ecartMontant / comparaison.ancienMontant) * 100 >
      (preferences.data?.variationPrixMaxPct ?? 10),
  );

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
      <View accessibilityRole="radiogroup" style={{ gap: 12 }}>
        {produits.map((produit) => (
          <Pressable
            key={`${produit.enseigne}:${produit.id}`}
            onPress={() => setSelection(produit)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selection?.id === produit.id }}
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
                <Badge
                  label={t(`checkout.pertinence_${produit.pertinence}`)}
                  variant={produit.validationRequise ? 'warning' : 'neutral'}
                />
              </View>
              <Price>{formatPrix(produit.prix)}</Price>
              {selection?.id === produit.id ? (
                <Check size={18} color={colors.primary} accessible={false} />
              ) : null}
            </Card>
          </Pressable>
        ))}
      </View>

      {source && selection && comparaison ? (
        <Card style={{ padding: 18, gap: 12 }}>
          <BodySm style={{ fontWeight: '700' }}>{t('checkout.comparaison_titre')}</BodySm>
          <View style={{ gap: 4 }}>
            <Caption>{t('checkout.produit_actuel')}</Caption>
            <BodySm>{source.ligne.produit}</BodySm>
            <Price>{formatPrix(comparaison.ancienMontant)}</Price>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <View style={{ gap: 4 }}>
            <Caption>{t('checkout.produit_propose')}</Caption>
            <BodySm>{selection.nom}</BodySm>
            <Price>{formatPrix(comparaison.nouveauMontant)}</Price>
            <Caption>{t('checkout.comparaison_paquets', { count: comparaison.nombrePaquets })}</Caption>
            <Caption>
              {comparaison.ecartMontant >= 0
                ? t('checkout.comparaison_plus_cher', { montant: formatPrix(comparaison.ecartMontant) })
                : t('checkout.comparaison_moins_cher', {
                    montant: formatPrix(Math.abs(comparaison.ecartMontant)),
                  })}
            </Caption>
            {comparaison.changeEnseigne ? (
              <Badge label={t('checkout.comparaison_change_enseigne')} variant="warning" />
            ) : null}
            {depasseVariationPreferee ? (
              <Badge label={t('checkout.comparaison_depasse_preference')} variant="warning" />
            ) : null}
            {!comparaison.formatCompatible ? (
              <Badge label={t('checkout.comparaison_format_inconnu')} variant="warning" />
            ) : null}
          </View>
          <Button label={t('checkout.confirmer_remplacement')} onPress={confirmer} />
        </Card>
      ) : null}
    </ScreenScroll>
  );
}
