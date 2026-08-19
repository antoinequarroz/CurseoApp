import React from 'react';
import { View } from 'react-native';
import { CheckCircle2, ShoppingBasket, Truck } from 'lucide-react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { BodySm, Caption, Heading } from '@/components/ui/Typography';
import { formatPrix } from '@/lib/format';
import { t } from '@/lib/i18n';
import { useTheme } from '@/lib/theme-context';
import { sousTotalPanier, type BrouillonPanierLive, type LivraisonDemo } from '@/stores/panierLiveStore';

export function ResumeCheckoutMultiEnseignes({
  brouillon,
  livraisons,
}: {
  brouillon: BrouillonPanierLive;
  livraisons: LivraisonDemo[];
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Heading>{t('checkout.resume_enseignes_titre')}</Heading>
        <Caption>{t('checkout.resume_enseignes_aide')}</Caption>
      </View>
      {brouillon.paniers.map((panier) => {
        const livraison = livraisons.find((element) => element.enseigne === panier.enseigne);
        return (
          <Card
            key={panier.enseigne}
            accessibilityRole="summary"
            style={{ padding: 16, gap: 12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ShoppingBasket size={20} color={colors.primary} accessible={false} />
              <Heading style={{ flex: 1 }}>{t(`checkout.enseigne_${panier.enseigne}`)}</Heading>
              <Badge label={t('checkout.panier_pret')} variant="success" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <BodySm>{t('checkout.articles_count', { count: panier.articles.length })}</BodySm>
              <BodySm style={{ fontVariant: ['tabular-nums'], fontWeight: '700' }}>
                {formatPrix(sousTotalPanier(panier))}
              </BodySm>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {livraison?.creneau ? (
                <CheckCircle2 size={18} color={colors.success} accessible={false} />
              ) : (
                <Truck size={18} color={colors.textMuted} accessible={false} />
              )}
              <Caption style={{ flex: 1 }}>
                {livraison?.creneau
                  ? t('checkout.creneau_pret')
                  : t('checkout.creneau_a_selectionner')}
              </Caption>
              <Caption style={{ fontVariant: ['tabular-nums'] }}>
                {formatPrix(livraison?.prix ?? 0)}
              </Caption>
            </View>
          </Card>
        );
      })}
    </View>
  );
}
