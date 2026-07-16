/** Planifier — onglets Recettes | Planning | Communauté. */
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { useResponsive } from '@/hooks/useResponsive';
import { useRecettes } from '@/hooks/useRecettes';
import { useProfilStore } from '@/stores/profilStore';
import { usePlanningStore } from '@/stores/planningStore';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';
import { SwipeRecette } from '@/components/recettes/SwipeRecette';
import { RecetteCard } from '@/components/recettes/RecetteCard';
import { PlanningHebdo } from '@/components/planning/PlanningHebdo';
import { ProchainSlot } from '@/components/planning/ProchainSlot';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRecetteCard } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Subheading, Caption, BodySm } from '@/components/ui/Typography';
import { analytics } from '@/lib/analytics';
import { t } from '@/lib/i18n';
import { JOURS_SEMAINE, type JourSemaine, type Recette } from '@/types';

/** Premier jour/moment ni planifie ni explicitement ignore — undefined si la semaine est complete. */
function trouverProchainSlot(planning: ReturnType<typeof usePlanningStore.getState>['planning']) {
  for (const jour of JOURS_SEMAINE) {
    const repas = planning[jour];
    if (!repas.midi && !repas.midiIgnore) return { jour, moment: 'midi' as const };
    if (!repas.soir && !repas.soirIgnore) return { jour, moment: 'soir' as const };
  }
  return undefined;
}

type SousOnglet = 'recettes' | 'planning' | 'communaute';

function SegmentedControl({ valeur, onChange }: { valeur: SousOnglet; onChange: (v: SousOnglet) => void }) {
  const { colors } = useTheme();
  const options: { id: SousOnglet; label: string }[] = [
    { id: 'recettes', label: t('planning.onglet_recettes') },
    { id: 'planning', label: t('planning.onglet_planning') },
    { id: 'communaute', label: t('planning.onglet_communaute') },
  ];

  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.bgSecondary, borderRadius: 18, padding: 5 }}>
      {options.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => onChange(o.id)}
          accessibilityRole="tab"
          accessibilityState={{ selected: valeur === o.id }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: valeur === o.id ? colors.bgCard : 'transparent',
            alignItems: 'center',
          }}
        >
          <Subheading>{o.label}</Subheading>
        </Pressable>
      ))}
    </View>
  );
}

export default function Planifier() {
  const haptics = useHaptics();
  const { colors } = useTheme();
  const { paddingHorizontal } = useResponsive();
  const profil = useProfilStore((s) => s.profil);
  const { planning, assignerRecette, ignorerRepas } = usePlanningStore();
  const [sousOnglet, setSousOnglet] = useState<SousOnglet>('recettes');
  const [indexCourant, setIndexCourant] = useState(0);
  const [recettesAimees, setRecettesAimees] = useState<Recette[]>([]);
  const [slotChoix, setSlotChoix] = useState<{ jour: JourSemaine; moment: 'midi' | 'soir' } | null>(null);
  const [portionsChoix, setPortionsChoix] = useState<number | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage } = useRecettes({ regime: profil?.regime });
  const recettes = useMemo(() => data?.pages.flat() ?? [], [data]);
  const recetteActuelle = recettes[indexCourant];
  const recettesCommunaute = useMemo(() => RECETTES_MOCK.filter((r) => r.est_communautaire), []);
  const prochainSlot = useMemo(() => trouverProchainSlot(planning), [planning]);

  const ouvrirChoixSlot = (jour: JourSemaine, moment: 'midi' | 'soir') => {
    setSlotChoix({ jour, moment });
    setPortionsChoix(profil?.nb_personnes ?? 1);
  };

  const genererSemaineIA = () => {
    void haptics.success();
    JOURS_SEMAINE.forEach((jour, i) => {
      const recette = recettesAimees[i % Math.max(recettesAimees.length, 1)];
      if (recette) assignerRecette(jour, 'midi', recette);
    });
    analytics.planningGenerated();
  };

  return (
    <Screen padded={false} bottomInset={false}>
      <View style={{ paddingHorizontal, gap: 14 }}>
        <View>
          <Caption>{t('planning.caption')}</Caption>
          <DisplayLG>{t('tabs.planifier')}</DisplayLG>
        </View>
        <SegmentedControl valeur={sousOnglet} onChange={setSousOnglet} />
      </View>

      {sousOnglet === 'recettes' && (
        <View style={{ flex: 1, paddingHorizontal, paddingTop: 16, paddingBottom: 96, justifyContent: 'center' }}>
          {isLoading ? (
            <SkeletonRecetteCard />
          ) : recetteActuelle ? (
            <SwipeRecette
              recette={recetteActuelle}
              profilId={profil?.id ?? 'demo-user'}
              onTapDetail={() => router.push(`/recette/${recetteActuelle.id}`)}
              onSwiped={(aime) => {
                if (aime) setRecettesAimees((prev) => [...prev, recetteActuelle]);
                if (indexCourant + 2 >= recettes.length && hasNextPage) void fetchNextPage();
                setIndexCourant((i) => i + 1);
              }}
            />
          ) : (
            <EmptyState
              illustration="recettes"
              titre={t('planning.empty_recettes_titre')}
              sousTitre={t('planning.empty_recettes_soustitre')}
              ctaLabel={t('planning.voir_planning')}
              onCta={() => setSousOnglet('planning')}
            />
          )}
        </View>
      )}

      {sousOnglet === 'planning' && (
        <ScreenScroll style={{ flex: 1 }} contentContainerStyle={{ gap: 16 }} padded>
          <Button label={t('planning.generer_semaine_ia')} onPress={genererSemaineIA} />
          {prochainSlot ? (
            <ProchainSlot
              jour={prochainSlot.jour}
              moment={prochainSlot.moment}
              onChoisirRecette={() => ouvrirChoixSlot(prochainSlot.jour, prochainSlot.moment)}
              onIgnorer={() => {
                void haptics.selection();
                ignorerRepas(prochainSlot.jour, prochainSlot.moment);
              }}
            />
          ) : (
            <EmptyState illustration="favoris" titre={t('planning.tout_planifie_titre')} sousTitre={t('planning.tout_planifie_soustitre')} />
          )}
          <PlanningHebdo planning={planning} onPressSlot={(jour, moment) => ouvrirChoixSlot(jour, moment)} />
        </ScreenScroll>
      )}

      {sousOnglet === 'communaute' && (
        <ScreenScroll style={{ flex: 1 }} contentContainerStyle={{ gap: 16 }} padded>
          {recettesCommunaute.length === 0 ? (
            <EmptyState
              illustration="recherche"
              titre={t('planning.empty_communaute_titre')}
              sousTitre={t('planning.empty_communaute_soustitre')}
            />
          ) : (
            <>
              <BodySm>{t('planning.communaute_intro', { count: recettesCommunaute.length })}</BodySm>
              {recettesCommunaute.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => router.push(`/recette/${r.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={t('planning.assigner_label', { titre: r.titre })}
                >
                  <RecetteCard recette={r} />
                </Pressable>
              ))}
            </>
          )}
        </ScreenScroll>
      )}

      <Modal visible={!!slotChoix} animationType="slide" onRequestClose={() => setSlotChoix(null)}>
        <ScreenScroll contentContainerStyle={{ gap: 12 }} tabBar={false}>
          <DisplayLG>{t('planning.choisir_recette')}</DisplayLG>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <BodySm style={{ fontWeight: '600' }}>{t('planning.portions_invites_titre')}</BodySm>
              <Caption>{t('planning.portions_invites_hint')}</Caption>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Pressable
                onPress={() => setPortionsChoix((p) => Math.max(1, (p ?? 1) - 1))}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.age_diminuer', { label: t('planning.portions_invites_titre') })}
                hitSlop={8}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}
              >
                <BodySm>–</BodySm>
              </Pressable>
              <BodySm style={{ minWidth: 24, textAlign: 'center' }}>{portionsChoix ?? profil?.nb_personnes ?? 1}</BodySm>
              <Pressable
                onPress={() => setPortionsChoix((p) => Math.min(20, (p ?? 1) + 1))}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.age_augmenter', { label: t('planning.portions_invites_titre') })}
                hitSlop={8}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}
              >
                <BodySm>+</BodySm>
              </Pressable>
            </View>
          </View>

          {recettesAimees.length === 0 ? (
            <EmptyState illustration="favoris" titre={t('planning.empty_favoris_titre')} sousTitre={t('planning.empty_favoris_soustitre')} />
          ) : (
            recettesAimees.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => {
                  if (slotChoix) {
                    const portionsFoyer = profil?.nb_personnes ?? 1;
                    const portionsFinales = portionsChoix ?? portionsFoyer;
                    assignerRecette(
                      slotChoix.jour,
                      slotChoix.moment,
                      r,
                      portionsFinales !== portionsFoyer ? portionsFinales : undefined,
                    );
                  }
                  setSlotChoix(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('planning.assigner_label', { titre: r.titre })}
              >
                <RecetteCard recette={r} />
              </Pressable>
            ))
          )}
          <Button label={t('commun.fermer')} variant="secondary" onPress={() => setSlotChoix(null)} />
        </ScreenScroll>
      </Modal>
    </Screen>
  );
}
