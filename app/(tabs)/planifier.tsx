/** Planifier — onglets Recettes | Planning | Communauté. */
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { useResponsive } from '@/hooks/useResponsive';
import { useRecettes } from '@/hooks/useRecettes';
import { useRecettesCommunautaires } from '@/hooks/useRecettesCommunautaires';
import { useAbonnement } from '@/hooks/useAbonnement';
import { useMembresFoyer } from '@/hooks/useMembresFoyer';
import { useCompatibiliteMembres } from '@/hooks/useCompatibiliteMembres';
import { useRepasSemaine } from '@/hooks/useRepasSemaine';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useProfilStore } from '@/stores/profilStore';
import { SwipeRecette } from '@/components/recettes/SwipeRecette';
import { RecetteCard } from '@/components/recettes/RecetteCard';
import { PlanningSemaine } from '@/components/planning/PlanningSemaine';
import { EmptyState } from '@/components/ui/EmptyState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { SkeletonRecetteCard, SkeletonPlanningJour } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Subheading, Caption, BodySm } from '@/components/ui/Typography';
import { toast } from '@/lib/toast';
import { analytics } from '@/lib/analytics';
import { dates } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { JOURS_SEMAINE, type JourSemaine, type PlanningHebdomadaire, type Recette } from '@/types';

/** Premier jour/moment ni planifie ni explicitement ignore — undefined si la semaine est complete. */
function trouverProchainSlot(planning: PlanningHebdomadaire) {
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
  const { estHorsLigne } = useNetworkStatus();
  const profil = useProfilStore((s) => s.profil);
  const [sousOnglet, setSousOnglet] = useState<SousOnglet>('recettes');
  const [indexCourant, setIndexCourant] = useState(0);
  const [recettesAimees, setRecettesAimees] = useState<Recette[]>([]);
  const [slotChoix, setSlotChoix] = useState<{ jour: JourSemaine; moment: 'midi' | 'soir' } | null>(null);
  const [portionsChoix, setPortionsChoix] = useState<number | null>(null);
  // COUR-25 : membres du foyer concernes par le repas en cours d'assignation
  // — vide = comportement historique (portions manuelles, aucun filtrage
  // supplementaire par rapport au foyer entier deja applique ci-dessus).
  const [membresChoisisIds, setMembresChoisisIds] = useState<string[]>([]);
  // COUR-27 : lundi de la semaine affichee dans l'onglet Planning — chaque
  // semaine a sa propre entree de cache (voir useRepasSemaine), changer de
  // semaine ne melange jamais les repas d'une autre.
  const [semaineAffichee, setSemaineAffichee] = useState(() => dates.debutSemaine(dates.maintenant()));

  const { data, isLoading, isError, isEmpty, refetch, fetchNextPage, hasNextPage, alertesParRecette, allergiesNonReconnues } = useRecettes({
    regime: profil?.regime,
    allergies: profil?.allergies,
  });
  const recettes = useMemo(() => data?.pages.flat() ?? [], [data]);
  const recetteActuelle = recettes[indexCourant];

  const {
    recettes: recettesCommunaute,
    total: totalRecettesCommunaute,
    isLoading: communauteEnChargement,
    isError: communauteEnErreur,
    isEmpty: communauteEstVide,
    isRefetching: communauteEnRafraichissement,
    refetch: rafraichirCommunaute,
    fetchNextPage: chargerPlusCommunaute,
    hasNextPage: communauteAPlus,
  } = useRecettesCommunautaires();

  const {
    planning,
    isLoading: planningEnChargement,
    isError: planningEnErreur,
    refetch: rafraichirPlanning,
    mutationEnCours: planningMutationEnCours,
    assigner,
    ignorer,
  } = useRepasSemaine(profil?.id, semaineAffichee);
  const prochainSlot = useMemo(() => trouverProchainSlot(planning), [planning]);
  const semaineActuelle = dates.estMemeSemaine(semaineAffichee, dates.maintenant());

  // Le picker de membres n'a de sens que pour le palier Famille (COUR-24) —
  // enabled=false ailleurs pour ne jamais forcer la creation d'un foyer.
  const { estAuMoins } = useAbonnement();
  const { membres } = useMembresFoyer(estAuMoins('famille'));
  const membresChoisis = useMemo(() => membres.filter((m) => membresChoisisIds.includes(m.id)), [membres, membresChoisisIds]);
  const {
    recettes: recettesAimeesCompatibles,
    alertesParRecette: alertesMembresParRecette,
    allergiesNonReconnues: allergiesMembresNonReconnues,
  } = useCompatibiliteMembres(recettesAimees, membresChoisis);

  const ouvrirChoixSlot = (jour: JourSemaine, moment: 'midi' | 'soir') => {
    setSlotChoix({ jour, moment });
    setPortionsChoix(profil?.nb_personnes ?? 1);
    setMembresChoisisIds([]);
  };

  const toggleMembreChoisi = (membreId: string) => {
    setMembresChoisisIds((actuel) => (actuel.includes(membreId) ? actuel.filter((id) => id !== membreId) : [...actuel, membreId]));
  };

  const genererSemaineIA = async () => {
    if (estHorsLigne) {
      toast.erreur(t('planning.action_hors_ligne'));
      return;
    }
    void haptics.success();
    for (const jour of JOURS_SEMAINE) {
      const recette = recettesAimees[JOURS_SEMAINE.indexOf(jour) % Math.max(recettesAimees.length, 1)];
      if (recette) await assigner(jour, 'midi', { recette });
    }
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
          ) : isError ? (
            <EmptyState
              illustration="recettes"
              titre={t('planning.erreur_recettes_titre')}
              sousTitre={t('planning.erreur_recettes_soustitre')}
              ctaLabel={t('commun.reessayer')}
              onCta={() => void refetch()}
            />
          ) : isEmpty ? (
            <EmptyState
              illustration="recettes"
              titre={t('planning.empty_catalogue_titre')}
              sousTitre={t('planning.empty_catalogue_soustitre')}
            />
          ) : recetteActuelle ? (
            <View style={{ gap: 10 }}>
              {allergiesNonReconnues.length > 0 && (
                <Caption style={{ color: colors.warning, textAlign: 'center' }}>
                  {t('planning.allergies_non_reconnues', { allergies: allergiesNonReconnues.join(', ') })}
                </Caption>
              )}
              <SwipeRecette
                recette={recetteActuelle}
                profilId={profil?.id ?? 'demo-user'}
                alerteAllergenes={alertesParRecette[recetteActuelle.id]}
                onTapDetail={() => router.push(`/recette/${recetteActuelle.id}`)}
                onSwiped={(aime) => {
                  if (aime) setRecettesAimees((prev) => [...prev, recetteActuelle]);
                  if (indexCourant + 2 >= recettes.length && hasNextPage) void fetchNextPage();
                  setIndexCourant((i) => i + 1);
                }}
              />
              {profil?.allergies?.length ? <Caption style={{ textAlign: 'center' }}>{t('planning.disclaimer_medical')}</Caption> : null}
            </View>
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
        <ScreenScroll style={{ flex: 1 }} contentContainerStyle={{ gap: 20 }} padded>
          {estHorsLigne && <OfflineBanner />}
          <Button label={t('planning.generer_semaine_ia')} onPress={() => void genererSemaineIA()} disabled={estHorsLigne || planningMutationEnCours} />
          {planningEnChargement ? (
            <SkeletonPlanningJour />
          ) : planningEnErreur ? (
            <EmptyState
              illustration="planning"
              titre={t('planning.erreur_planning_titre')}
              sousTitre={t('planning.erreur_planning_soustitre')}
              ctaLabel={t('commun.reessayer')}
              onCta={() => void rafraichirPlanning()}
            />
          ) : (
            <>
              {!prochainSlot && (
                <EmptyState illustration="favoris" titre={t('planning.tout_planifie_titre')} sousTitre={t('planning.tout_planifie_soustitre')} />
              )}
              <PlanningSemaine
                planning={planning}
                semaineDebut={semaineAffichee}
                jourInitial={prochainSlot?.jour ?? (semaineActuelle ? dates.jourSemaine(dates.maintenant()) : 'lundi')}
                onPressSlot={(jour, moment) => ouvrirChoixSlot(jour, moment)}
                onIgnorer={(jour, moment) => {
                  if (estHorsLigne) {
                    toast.erreur(t('planning.action_hors_ligne'));
                    return;
                  }
                  void haptics.selection();
                  void ignorer(jour, moment);
                }}
                onChangerSemaine={(delta) => setSemaineAffichee((s) => dates.ajouterSemaines(s, delta))}
                onRetourAujourdhui={() => setSemaineAffichee(dates.debutSemaine(dates.maintenant()))}
              />
            </>
          )}
        </ScreenScroll>
      )}

      {sousOnglet === 'communaute' && (
        <ScreenScroll
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 16 }}
          padded
          refreshControl={
            <RefreshControl refreshing={communauteEnRafraichissement} onRefresh={() => void rafraichirCommunaute()} tintColor={colors.primary} />
          }
        >
          {communauteEnChargement ? (
            <SkeletonRecetteCard />
          ) : communauteEnErreur ? (
            <EmptyState
              illustration="recherche"
              titre={t('planning.erreur_communaute_titre')}
              sousTitre={t('planning.erreur_communaute_soustitre')}
              ctaLabel={t('commun.reessayer')}
              onCta={() => void rafraichirCommunaute()}
            />
          ) : communauteEstVide ? (
            <EmptyState
              illustration="recherche"
              titre={t('planning.empty_communaute_titre')}
              sousTitre={t('planning.empty_communaute_soustitre')}
            />
          ) : (
            <>
              <BodySm>{t('planning.communaute_intro', { count: totalRecettesCommunaute })}</BodySm>
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
              {communauteAPlus && (
                <Button label={t('planning.charger_plus_communaute')} variant="secondary" onPress={() => chargerPlusCommunaute()} />
              )}
            </>
          )}
        </ScreenScroll>
      )}

      <Modal visible={!!slotChoix} animationType="slide" onRequestClose={() => setSlotChoix(null)}>
        <ScreenScroll contentContainerStyle={{ gap: 12 }} tabBar={false}>
          <DisplayLG>{t('planning.choisir_recette')}</DisplayLG>

          {estAuMoins('famille') && membres.length > 0 && (
            <View style={{ gap: 6 }}>
              <BodySm style={{ fontWeight: '600' }}>{t('planning.membres_titre')}</BodySm>
              <Caption>{t('planning.membres_hint')}</Caption>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {membres.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => toggleMembreChoisi(m.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: membresChoisisIds.includes(m.id) }}
                    accessibilityLabel={m.prenom}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 9999,
                      backgroundColor: membresChoisisIds.includes(m.id) ? colors.primary : colors.bgSecondary,
                    }}
                  >
                    <BodySm style={{ color: membresChoisisIds.includes(m.id) ? '#FFFFFF' : colors.textPrimary }}>{m.prenom}</BodySm>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <BodySm style={{ fontWeight: '600' }}>{t('planning.portions_invites_titre')}</BodySm>
              <Caption>
                {membresChoisisIds.length > 0 ? t('planning.portions_derivees_hint') : t('planning.portions_invites_hint')}
              </Caption>
            </View>
            {membresChoisisIds.length > 0 ? (
              <BodySm style={{ minWidth: 24, textAlign: 'center' }}>{membresChoisisIds.length}</BodySm>
            ) : (
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
            )}
          </View>

          {allergiesMembresNonReconnues.length > 0 && (
            <Caption style={{ color: colors.warning }}>
              {t('planning.allergies_non_reconnues', { allergies: allergiesMembresNonReconnues.join(', ') })}
            </Caption>
          )}

          {recettesAimees.length === 0 ? (
            <EmptyState illustration="favoris" titre={t('planning.empty_favoris_titre')} sousTitre={t('planning.empty_favoris_soustitre')} />
          ) : recettesAimeesCompatibles.length === 0 ? (
            <EmptyState
              illustration="favoris"
              titre={t('planning.aucune_recette_compatible_titre')}
              sousTitre={t('planning.aucune_recette_compatible_soustitre')}
            />
          ) : (
            recettesAimeesCompatibles.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => {
                  if (estHorsLigne) {
                    toast.erreur(t('planning.action_hors_ligne'));
                    return;
                  }
                  if (slotChoix) {
                    const portionsFoyer = profil?.nb_personnes ?? 1;
                    const portionsFinales = membresChoisisIds.length > 0 ? membresChoisisIds.length : (portionsChoix ?? portionsFoyer);
                    void assigner(slotChoix.jour, slotChoix.moment, {
                      recette: r,
                      portions: portionsFinales !== portionsFoyer ? portionsFinales : undefined,
                      membreIds: membresChoisisIds.length > 0 ? membresChoisisIds : undefined,
                    });
                  }
                  setSlotChoix(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('planning.assigner_label', { titre: r.titre })}
              >
                <RecetteCard recette={r} alerteAllergenes={alertesMembresParRecette[r.id]} />
              </Pressable>
            ))
          )}
          <Button label={t('commun.fermer')} variant="secondary" onPress={() => setSlotChoix(null)} />
        </ScreenScroll>
      </Modal>
    </Screen>
  );
}
