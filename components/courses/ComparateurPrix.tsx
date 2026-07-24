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
import { dates } from '@/lib/dates';
import { t } from '@/lib/i18n';
import type { NiveauAbonnement } from '@/types';
import type { OffrePrix } from '@/lib/prixRepository';

const NOM_ENSEIGNE: Record<string, string> = {
  coop: t('onboarding.enseigne_coop'),
  migros: t('onboarding.enseigne_migros'),
  lidl: t('onboarding.enseigne_lidl'),
  aldi: t('onboarding.enseigne_aldi'),
  ottos: t('onboarding.enseigne_ottos'),
  manor_food: t('onboarding.enseigne_manor_food'),
};

function LigneOffre({ offre, estMeilleurPrix }: { offre: OffrePrix; estMeilleurPrix: boolean }) {
  const { colors } = useTheme();
  // COUR-21 : `expire` vient de la vue `prix_courant` (duree de validite
  // par source, table `regles_fraicheur_prix`) — jamais recalcule ici, pour
  // ne jamais afficher un prix perime comme s'il etait encore d'actualite
  // avec un seuil qui aurait pu diverger du seuil reel cote base.
  const perime = offre.expire;

  return (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: colors.bgSecondary,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: enseigneColors[offre.enseigne] }} />
          <Body>{NOM_ENSEIGNE[offre.enseigne] ?? offre.enseigne}</Body>
          {offre.format ? <Caption>{offre.format}</Caption> : null}
          {offre.promotion ? <Badge label={offre.promotion} variant="warning" /> : null}
          {estMeilleurPrix ? <Badge label={t('courses.meilleur_prix')} variant="meilleurPrix" /> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Price>{formatPrix(offre.prix)}</Price>
          <Caption>{t('comparateur.prix_par_unite', { prix: formatPrix(offre.prixUnitaire), unite: offre.unite })}</Caption>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Caption style={perime ? { color: colors.warning } : undefined}>
          {perime
            ? t('comparateur.prix_peut_etre_perime', { date: dates.formatCourt(new Date(offre.collecteLe)) })
            : t('comparateur.maj_le', { date: dates.formatCourt(new Date(offre.collecteLe)) })}
        </Caption>
        <Caption>{t('comparateur.source', { source: offre.source })}</Caption>
      </View>
    </View>
  );
}

export function ComparateurPrix({ produit, onChoisirPalier }: { produit: string; onChoisirPalier: (p: NiveauAbonnement) => void }) {
  const { colors } = useTheme();
  const { estAuMoins } = useAbonnement();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const { data: comparatif, isLoading, isError } = usePrix(produit);

  if (!estAuMoins('standard')) {
    return (
      <>
        <BodySm onPress={() => setPaywallVisible(true)} style={{ color: colors.primary }}>
          {t('comparateur.debloquer')}
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
  if (isError) return <Caption>{t('comparateur.indisponible')}</Caption>;
  if (!comparatif) return <Caption>{t('comparateur.non_trouve')}</Caption>;
  if (comparatif.offres.length === 0) return <Caption>{t('comparateur.aucun_prix')}</Caption>;

  return (
    <View style={{ gap: 8 }}>
      {comparatif.offres.map((offre) => (
        <LigneOffre
          key={offre.offreId}
          offre={offre}
          estMeilleurPrix={offre.prixUnitaire === comparatif.meilleurPrixUnitaire}
        />
      ))}
    </View>
  );
}
