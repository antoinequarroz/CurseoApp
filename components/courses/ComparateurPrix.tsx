/** Tableau des prix par enseigne pour un produit — reserve aux abonnes Standard+. */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, Info, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useAbonnement } from '@/hooks/useAbonnement';
import { usePrix } from '@/hooks/usePrix';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
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

const ENSEIGNES_COMPAREES = Object.keys(NOM_ENSEIGNE);

function libelleFiabilite(offre: OffrePrix): string {
  if (offre.source === 'mock') return t('comparateur.fiabilite_demo');
  if (offre.source.toLowerCase().includes('live')) return t('comparateur.fiabilite_live');
  return t('comparateur.fiabilite_indicative');
}

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
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: enseigneColors[offre.enseigne],
            }}
          />
          <Body>{NOM_ENSEIGNE[offre.enseigne] ?? offre.enseigne}</Body>
          {offre.format ? <Caption>{offre.format}</Caption> : null}
          {offre.promotion ? <Badge label={offre.promotion} variant="warning" /> : null}
          {estMeilleurPrix ? <Badge label={t('courses.meilleur_prix')} variant="meilleurPrix" /> : null}
          <Badge label={libelleFiabilite(offre)} variant={perime ? 'warning' : 'neutral'} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Price>{formatPrix(offre.prix)}</Price>
          <Caption>
            {t('comparateur.prix_par_unite', { prix: formatPrix(offre.prixUnitaire), unite: offre.unite })}
          </Caption>
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

export function ComparateurPrix({
  produit,
  onChoisirPalier,
}: {
  produit: string;
  onChoisirPalier: (p: NiveauAbonnement) => void;
}) {
  const { colors } = useTheme();
  const { estAuMoins } = useAbonnement();
  const { estHorsLigne } = useNetworkStatus();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const estStandard = estAuMoins('standard');
  const {
    data: comparatif,
    isLoading,
    isError,
    refetch,
  } = usePrix(produit, {
    enabled: estStandard && ouvert && !estHorsLigne,
  });

  if (!estStandard) {
    return (
      <>
        <Pressable
          onPress={() => setPaywallVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('comparateur.debloquer')}
          style={{ paddingVertical: 8 }}
        >
          <BodySm style={{ color: colors.primary }}>{t('comparateur.debloquer')}</BodySm>
        </Pressable>
        <PaywallModal
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          onChoisir={onChoisirPalier}
          featureOrigine="comparateur_prix"
        />
      </>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <Pressable
        onPress={() => setOuvert((valeur) => !valeur)}
        accessibilityRole="button"
        accessibilityState={{ expanded: ouvert }}
        accessibilityLabel={t(ouvert ? 'comparateur.masquer' : 'comparateur.afficher', { produit })}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 8,
          minHeight: 44,
        }}
      >
        <BodySm style={{ color: colors.primary }}>
          {t(ouvert ? 'comparateur.masquer_court' : 'comparateur.afficher_court')}
        </BodySm>
        <ChevronDown
          size={16}
          color={colors.primary}
          style={{ transform: [{ rotate: ouvert ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {ouvert && (
        <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
          {estHorsLigne && !comparatif ? (
            <Caption style={{ color: colors.warning }}>{t('comparateur.hors_ligne')}</Caption>
          ) : isLoading ? (
            <SkeletonComparateur />
          ) : isError ? (
            <View style={{ gap: 6, alignItems: 'flex-start' }}>
              <Caption>{t('comparateur.indisponible')}</Caption>
              <Pressable
                onPress={() => void refetch()}
                accessibilityRole="button"
                accessibilityLabel={t('comparateur.reessayer')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}
              >
                <RefreshCw size={14} color={colors.primary} />
                <BodySm style={{ color: colors.primary }}>{t('comparateur.reessayer')}</BodySm>
              </Pressable>
            </View>
          ) : !comparatif ? (
            <Caption>{t('comparateur.non_trouve')}</Caption>
          ) : comparatif.offres.length === 0 ? (
            <Caption>{t('comparateur.aucun_prix')}</Caption>
          ) : (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.bgWarm,
                }}
              >
                <Info size={16} color={colors.primary} accessibilityElementsHidden />
                <Caption style={{ color: colors.textSecondary, flex: 1 }}>
                  {t('comparateur.avertissement_test')}
                </Caption>
              </View>
              {estHorsLigne && (
                <Caption style={{ color: colors.warning }}>{t('comparateur.cache_hors_ligne')}</Caption>
              )}
              {comparatif.offres.map((offre) => (
                <LigneOffre
                  key={offre.offreId}
                  offre={offre}
                  estMeilleurPrix={offre.prixUnitaire === comparatif.meilleurPrixUnitaire}
                />
              ))}
              {ENSEIGNES_COMPAREES.some(
                (enseigne) => !comparatif.offres.some((offre) => offre.enseigne === enseigne),
              ) ? (
                <Caption>
                  {t('comparateur.enseignes_sans_resultat', {
                    enseignes: ENSEIGNES_COMPAREES
                      .filter((enseigne) => !comparatif.offres.some((offre) => offre.enseigne === enseigne))
                      .map((enseigne) => NOM_ENSEIGNE[enseigne])
                      .join(', '),
                  })}
                </Caption>
              ) : null}
            </>
          )}
        </View>
      )}
    </View>
  );
}
