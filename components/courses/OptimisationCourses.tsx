import React, { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { AlertTriangle, MapPin, Route, Store } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Body, BodySm, Caption, Heading, PriceLG, Savings, Subheading } from '@/components/ui/Typography';
import { enseigneColors } from '@/lib/theme';
import { formatPrix } from '@/lib/format';
import { dates } from '@/lib/dates';
import {
  optimiserListeCoursesLive,
  type OptimisationCoursesLive,
  type OptionOptimisationCoursesLive,
} from '@/lib/swissGroceriesRepository';
import { t } from '@/lib/i18n';
import type { Enseigne, ItemCourse, ModeOptimisation, PreferencesCoursesEnLigne } from '@/types';

const NOM_ENSEIGNE: Record<string, string> = {
  coop: 'Coop',
  migros: 'Migros',
  lidl: 'Lidl',
  aldi: 'Aldi',
  ottos: "Otto's",
};

interface Props {
  items: ItemCourse[];
  mode: ModeOptimisation;
  enseignesFavorites: Enseigne[];
  preferences?: PreferencesCoursesEnLigne;
  estStandard: boolean;
  onDebloquer: () => void;
  onPreparerPaniers: (
    resultat: OptimisationCoursesLive,
    option: OptionOptimisationCoursesLive,
    npa: string,
  ) => void;
}

export function OptimisationCourses({
  items,
  mode,
  enseignesFavorites,
  preferences,
  estStandard,
  onDebloquer,
  onPreparerPaniers,
}: Props) {
  const { colors } = useTheme();
  const { estHorsLigne } = useNetworkStatus();
  const [npa, setNpa] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{
    data: OptimisationCoursesLive;
    signature: string;
    mode: ModeOptimisation;
  } | null>(null);
  const signature = useMemo(
    () => items.map((item) => `${item.id}:${item.quantite}:${item.coche}`).join('|'),
    [items],
  );

  const resultatActuel = resultat?.signature === signature && resultat.mode === mode ? resultat.data : null;

  const optimiser = async () => {
    if (!estStandard) {
      onDebloquer();
      return;
    }
    if (estHorsLigne) {
      setErreur(t('courses.optimisation_hors_ligne'));
      return;
    }
    if (!/^\d{4}$/.test(npa)) {
      setErreur(t('courses.optimisation_npa_invalide'));
      return;
    }

    setChargement(true);
    setErreur(null);
    try {
      const data = await optimiserListeCoursesLive({ items, npa, mode, enseignesFavorites, preferences });
      setResultat({ data, signature, mode });
    } catch {
      setErreur(
        t(resultatActuel ? 'courses.optimisation_erreur_ancien_resultat' : 'courses.optimisation_erreur'),
      );
    } finally {
      setChargement(false);
    }
  };

  return (
    <Card style={{ padding: 18, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.bgWarm,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Route size={22} strokeWidth={2} color={colors.accentDark} accessible={false} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Heading>{t('courses.optimisation_titre')}</Heading>
          <BodySm>{t('courses.optimisation_description')}</BodySm>
        </View>
        <Badge label={t('courses.optimisation_live')} variant="success" />
      </View>

      <View style={{ gap: 7 }}>
        <Body nativeID="optimisation-npa-label" style={{ fontWeight: '600' }}>
          {t('courses.optimisation_npa_label')}
        </Body>
        <View style={{ position: 'relative', justifyContent: 'center' }}>
          <MapPin
            size={19}
            strokeWidth={1.5}
            color={colors.textMuted}
            style={{ position: 'absolute', left: 14, zIndex: 1 }}
            accessible={false}
          />
          <TextInput
            value={npa}
            onChangeText={(valeur) => {
              setNpa(valeur.replace(/\D/g, '').slice(0, 4));
              setErreur(null);
            }}
            keyboardType="number-pad"
            textContentType="postalCode"
            autoComplete="postal-code"
            maxLength={4}
            placeholder={t('courses.optimisation_npa_placeholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('courses.optimisation_npa_label')}
            accessibilityLabelledBy="optimisation-npa-label"
            accessibilityHint={t('courses.optimisation_npa_hint')}
            style={{
              minHeight: 50,
              borderRadius: 14,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: erreur && !/^\d{4}$/.test(npa) ? colors.error : colors.border,
              backgroundColor: colors.bgSecondary,
              color: colors.textPrimary,
              paddingLeft: 44,
              paddingRight: 14,
              fontSize: 16,
              fontVariant: ['tabular-nums'],
            }}
          />
        </View>
      </View>

      {erreur ? (
        <View
          accessibilityRole="alert"
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            padding: 12,
            borderRadius: 14,
            backgroundColor: colors.swipePass,
          }}
        >
          <AlertTriangle size={18} color={colors.chipTextError} accessible={false} />
          <BodySm style={{ flex: 1, color: colors.chipTextError }}>{erreur}</BodySm>
        </View>
      ) : null}

      <Button
        testID="optimiser-courses"
        label={estStandard ? t('courses.optimisation_bouton') : t('courses.optimisation_debloquer')}
        onPress={() => void optimiser()}
        loading={chargement}
        disabled={items.every((item) => item.coche)}
        accessibilityHint={t('courses.optimisation_bouton_hint')}
      />

      <View accessibilityLiveRegion="polite">
        {resultatActuel ? (
          <ResultatOptimisation
            key={resultatActuel.collecteLe}
            resultat={resultatActuel}
            npa={npa}
            onPreparer={onPreparerPaniers}
          />
        ) : null}
      </View>
    </Card>
  );
}

function ResultatOptimisation({
  resultat,
  npa,
  onPreparer,
}: {
  resultat: OptimisationCoursesLive;
  npa: string;
  onPreparer: Props['onPreparerPaniers'];
}) {
  const { colors } = useTheme();
  const optionPrincipale: OptionOptimisationCoursesLive = {
    id: `principal:${resultat.strategie}:${resultat.montantTotal}`,
    strategie: resultat.strategie,
    montantTotal: resultat.montantTotal,
    arrets: resultat.arrets,
    articlesNonTrouves: resultat.articlesNonTrouves,
  };
  const options = [optionPrincipale, ...(resultat.alternatives ?? [])];
  const [optionId, setOptionId] = useState(optionPrincipale.id);
  const option = options.find((candidate) => candidate.id === optionId) ?? optionPrincipale;
  const articlesTrouves = option.arrets.reduce((total, arret) => total + arret.articles.length, 0);

  return (
    <View accessibilityRole="summary" style={{ gap: 14 }}>
      <View style={{ gap: 3 }}>
        <Caption>{t('courses.optimisation_total_estime')}</Caption>
        <PriceLG>{formatPrix(option.montantTotal)}</PriceLG>
        <BodySm>
          {t('courses.optimisation_resume', { magasins: option.arrets.length, articles: articlesTrouves })}
        </BodySm>
        {resultat.economieEstimee && resultat.economieEstimee > 0 ? (
          <Savings>
            {t('courses.optimisation_economie', { montant: formatPrix(resultat.economieEstimee) })}
          </Savings>
        ) : null}
      </View>

      {options.length > 1 ? (
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          <BodySm style={{ fontWeight: '600' }}>{t('courses.options_panier_titre')}</BodySm>
          {options.map((candidate, index) => {
            const selectionnee = candidate.id === option.id;
            return (
              <Pressable
                key={candidate.id}
                onPress={() => setOptionId(candidate.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectionnee }}
                accessibilityLabel={t('courses.option_panier_label', {
                  magasins: candidate.arrets.length,
                  montant: formatPrix(candidate.montantTotal),
                })}
                style={{
                  minHeight: 52,
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: selectionnee ? colors.primary : colors.border,
                  backgroundColor: selectionnee ? colors.bgSecondary : colors.bgCard,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <BodySm style={{ flex: 1, fontWeight: selectionnee ? '700' : '500' }}>
                  {index === 0 ? t('courses.option_recommandee') : t('courses.option_alternative', { index })}
                </BodySm>
                <BodySm style={{ fontVariant: ['tabular-nums'] }}>
                  {formatPrix(candidate.montantTotal)}
                </BodySm>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {option.arrets.map((arret) => (
        <View
          key={`${arret.enseigne}:${arret.magasin ?? ''}`}
          style={{
            padding: 14,
            gap: 10,
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: colors.bgSecondary,
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: enseigneColors[arret.enseigne],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Store size={16} color="#FFFFFF" accessible={false} />
              </View>
              <View style={{ flex: 1 }}>
                <Subheading>{NOM_ENSEIGNE[arret.enseigne] ?? arret.enseigne}</Subheading>
                {arret.magasin ? <Caption numberOfLines={1}>{arret.magasin}</Caption> : null}
              </View>
            </View>
            <Subheading>{formatPrix(arret.montant)}</Subheading>
          </View>

          {arret.articles.map((article, index) => (
            <View
              key={`${article.demande}:${index}`}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <BodySm style={{ color: colors.textPrimary }}>{article.produit}</BodySm>
                {article.marque || article.format ? (
                  <Caption>{[article.marque, article.format].filter(Boolean).join(' · ')}</Caption>
                ) : null}
              </View>
              <BodySm style={{ color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
                {formatPrix(article.montant)}
              </BodySm>
            </View>
          ))}
        </View>
      ))}

      {option.articlesNonTrouves.length > 0 ? (
        <View style={{ gap: 4, padding: 12, borderRadius: 14, backgroundColor: colors.warningBg }}>
          <BodySm style={{ color: colors.chipTextWarning, fontWeight: '600' }}>
            {t('courses.optimisation_non_trouves_titre', { count: option.articlesNonTrouves.length })}
          </BodySm>
          <Caption style={{ color: colors.chipTextWarning }}>{option.articlesNonTrouves.join(', ')}</Caption>
          <Caption style={{ color: colors.chipTextWarning }}>
            {t('courses.optimisation_non_trouves_description')}
          </Caption>
        </View>
      ) : null}

      <Caption>{t('courses.optimisation_disclaimer')}</Caption>
      <Caption>
        {t('courses.optimisation_source', {
          source: resultat.source,
          date: dates.formatDateHeureCourte(new Date(resultat.collecteLe)),
        })}
      </Caption>
      <Button
        label={t('courses.preparer_paniers')}
        onPress={() => onPreparer(resultat, option, npa)}
        accessibilityHint={t('courses.preparer_paniers_hint')}
      />
    </View>
  );
}
