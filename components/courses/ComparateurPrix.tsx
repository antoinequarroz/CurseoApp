/** Tableau des prix par enseigne pour un produit — reserve aux abonnes Standard+. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/lib/theme-context';
import { useAbonnement } from '@/hooks/useAbonnement';
import { usePrix } from '@/hooks/usePrix';
import { enseigneColors } from '@/lib/theme';
import { Body, BodySm, Price, Caption } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { SkeletonComparateur } from '@/components/ui/Skeleton';
import { PaywallModal } from '@/components/ui/PaywallModal';
import { formatPrix } from '@/lib/format';
import type { NiveauAbonnement } from '@/types';

const NOM_ENSEIGNE: Record<string, string> = {
  coop: 'Coop',
  migros: 'Migros',
  lidl: 'Lidl',
  aldi: 'Aldi',
};

export function ComparateurPrix({ produit, onChoisirPalier }: { produit: string; onChoisirPalier: (p: NiveauAbonnement) => void }) {
  const { colors } = useTheme();
  const { estAuMoins } = useAbonnement();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const { data: comparatif, isLoading, isError } = usePrix(produit);

  if (!estAuMoins('standard')) {
    return (
      <>
        <BodySm onPress={() => setPaywallVisible(true)} style={{ color: colors.primary }}>
          Débloquer le comparateur de prix →
        </BodySm>
        <PaywallModal
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          onChoisir={onChoisirPalier}
          featureOrigine="comparateur_prix"
        />
      </>
    );
  }

  if (isLoading) return <SkeletonComparateur />;
  if (isError || !comparatif) return <Caption>Prix indisponibles pour ce produit.</Caption>;

  return (
    <View style={{ gap: 8 }}>
      {comparatif.prix.map((p) => (
        <View
          key={p.enseigne}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: colors.bgSecondary,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: enseigneColors[p.enseigne] }} />
            <Body>{NOM_ENSEIGNE[p.enseigne] ?? p.enseigne}</Body>
            {p.promotion ? <Badge label={p.promotion} variant="warning" /> : null}
            {p.enseigne === comparatif.meilleur_prix ? <Badge label="Meilleur prix" variant="meilleurPrix" /> : null}
          </View>
          <Price>{formatPrix(p.prix_unitaire)}</Price>
        </View>
      ))}
    </View>
  );
}
