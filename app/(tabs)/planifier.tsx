/** Planifier — onglets Recettes | Planning | Communauté. */
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
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
import { useCoursesStore } from '@/stores/coursesStore';
import { useGoutsStore } from '@/stores/goutsStore';
import { useProfilStore } from '@/stores/profilStore';
import { SwipeRecette } from '@/components/recettes/SwipeRecette';
import { RecetteCard } from '@/components/recettes/RecetteCard';
import { PlanningSemaine } from '@/components/planning/PlanningSemaine';
import { SelecteurRepasSwipe, type SelectionRepas } from '@/components/planning/SelecteurRepasSwipe';
import { EmptyState } from '@/components/ui/EmptyState';
import { OfflineBannerView } from '@/components/ui/OfflineBanner';
import { SkeletonRecetteCard, SkeletonPlanningJour } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Subheading, Caption, BodySm } from '@/components/ui/Typography';
import { toast } from '@/lib/toast';
import { analytics } from '@/lib/analytics';
import { dates } from '@/lib/dates';
import { proposerPlanning } from '@/lib/generateurPlanning';
import { t } from '@/lib/i18n';
import { JOURS_SEMAINE, type JourSemaine, type PlanningHebdomadaire } from '@/types';

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
          testID={`planning-segment-${o.id}`}
          onPress={() => onChange(o.id)}
          accessibilityRole="tab"
          accessibilityState={{ selected: valeur === o.id }}
          style={{
            flex: 1,
            minHeight: 44,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: valeur === o.id ? colors.bgCard : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Subheading>{o.label}</Subheading>
        </Pressable>
      ))}
    </View>
  );
}

function CatalogueNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingLeft: 14,
        paddingRight: 6,
        minHeight: 48,
        borderRadius: 16,
        backgroundColor: colors.warningBg,
      }}
    >
      <BodySm style={{ flex: 1, color: colors.chipTextWarning }} accessibilityLiveRegion="polite">
        {message}
      </BodySm>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t('commun.reessayer')}
        hitSlop={4}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 }}
      >
        <RefreshCw size={20} strokeWidth={2} color={colors.chipTextWarning} accessible={false} />
      </Pressable>
    </View>
  );
}

export default function Planifier() {
  const haptics = useHaptics();
  const { colors } = useTheme();
  const { paddingHorizontal, height } = useResponsive();
  const { estHorsLigne } = useNetworkStatus();
  const profil = useProfilStore((s) => s.profil);
  const genererCoursesDepuisPlanning = useCoursesStore((s) => s.genererDepuisPlanning);
  const swipes = useGoutsStore((s) => s.swipes);
  const enregistrerSwipe = useGoutsStore((s) => s.enregistrerSwipe);
  const [sousOnglet, setSousOnglet] = useState<SousOnglet>('recettes');
  const [indexCourant, setIndexCourant] = useState(0);
  const [slotChoix, setSlotChoix] = useState<{ jour: JourSemaine; moment: 'midi' | 'soir' } | null>(null);
  const [portionsChoix, setPortionsChoix] = useState<number | null>(null);
  const [modeChoixRecette, setModeChoixRecette] = useState(false);
  const [deplacementOuvert, setDeplacementOuvert] = useState(false);
  const [destinationDeplacement, setDestinationDeplacement] = useState<SelectionRepas | null>(null);
  // COUR-25 : membres du foyer concernes par le repas en cours d'assignation
  // — vide = comportement historique (portions manuelles, aucun filtrage
  // supplementaire par rapport au foyer entier deja applique ci-dessus).
  const [membresChoisisIds, setMembresChoisisIds] = useState<string[]>([]);
  // COUR-27 : lundi de la semaine affichee dans l'onglet Planning — chaque
  // semaine a sa propre entree de cache (voir useRepasSemaine), changer de
  // semaine ne melange jamais les repas d'une autre.
  const [semaineAffichee, setSemaineAffichee] = useState(() => dates.debutSemaine(dates.maintenant()));
  const [selectionSwipeManuelle, setSelectionSwipeManuelle] = useState<SelectionRepas | null>(null);
  const [portionsSwipe, setPortionsSwipe] = useState<number | null>(null);

  const {
    data,
    isLoading,
    isError,
    isCatalogueEmpty,
    isFilteredEmpty,
    isRefetching,
    hasCachedData,
    refetch,
    fetchNextPage,
    hasNextPage,
    alertesParRecette,
    allergiesNonReconnues,
    toutesRecettes = [],
  } = useRecettes({
    regime: profil?.regime,
    allergies: profil?.allergies,
  });
  const recettes = useMemo(() => data?.pages.flat() ?? [], [data]);
  const recettesAimees = useMemo(
    () => toutesRecettes.filter((recette) => swipes[recette.id] === true),
    [toutesRecettes, swipes],
  );
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
    isRefetching: planningEnRafraichissement,
    hasCachedData: planningEnCache,
    refetch: rafraichirPlanning,
    mutationEnCours: planningMutationEnCours,
    assigner,
    ignorer,
    synchronisationsEnAttente,
    peutAnnuler,
    assignerPlusieurs,
    deplacer,
    retirer,
    annulerDerniereAction,
  } = useRepasSemaine(profil?.id, semaineAffichee, estHorsLigne);
  const prochainSlot = useMemo(() => trouverProchainSlot(planning), [planning]);
  const slotSwipe = selectionSwipeManuelle ?? prochainSlot;
  const nombreRepasPlanifies = useMemo(
    () => Object.values(planning).reduce((total, jour) => total + Number(Boolean(jour.midi)) + Number(Boolean(jour.soir)), 0),
    [planning],
  );
  const nombreCreneauxDecides = useMemo(
    () => Object.values(planning).reduce(
      (total, jour) => total + Number(Boolean(jour.midi || jour.midiIgnore)) + Number(Boolean(jour.soir || jour.soirIgnore)),
      0,
    ),
    [planning],
  );
  const semaineActuelle = dates.estMemeSemaine(semaineAffichee, dates.maintenant());
  const repasSlotChoix = slotChoix ? planning[slotChoix.jour][slotChoix.moment] : undefined;

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
    const repasExistant = planning[jour][moment];
    setPortionsChoix(repasExistant?.portions ?? profil?.nb_personnes ?? 1);
    setMembresChoisisIds(repasExistant?.membreIds ?? []);
    setModeChoixRecette(!repasExistant);
    setDeplacementOuvert(false);
    setDestinationDeplacement(null);
  };

  const selectionnerSlotSwipe = (selection: SelectionRepas) => {
    const repasExistant = planning[selection.jour][selection.moment];
    setSelectionSwipeManuelle(selection);
    setPortionsSwipe(repasExistant?.portions ?? null);
  };

  const changerSemaine = (delta: number) => {
    setSelectionSwipeManuelle(null);
    setPortionsSwipe(null);
    setSemaineAffichee((semaine) => dates.ajouterSemaines(semaine, delta));
  };

  const avancerRecette = () => {
    if (indexCourant + 2 >= recettes.length && hasNextPage) void fetchNextPage();
    setIndexCourant((index) => index + 1);
  };

  const toggleMembreChoisi = (membreId: string) => {
    setMembresChoisisIds((actuel) => (actuel.includes(membreId) ? actuel.filter((id) => id !== membreId) : [...actuel, membreId]));
  };

  const remplirAvecFavoris = async () => {
    void haptics.success();
    await assignerPlusieurs(proposerPlanning(planning, recettesAimees));
    if (estHorsLigne) toast.info(t('planning.sauvegarde_hors_ligne'));
    analytics.planningGenerated();
  };

  const creerListeCourses = () => {
    if (!profil || nombreRepasPlanifies === 0) return;
    genererCoursesDepuisPlanning(planning, profil);
    analytics.shoppingListGenerated(useCoursesStore.getState().items.length);
    router.push('/(tabs)/courses');
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
        <View style={{ flex: 1, paddingHorizontal, paddingTop: 10, paddingBottom: 96, justifyContent: 'flex-start' }}>
          {estHorsLigne && (
            <View style={{ marginBottom: 12 }}>
              <OfflineBannerView visible message={t('planning.hors_ligne_cache')} />
            </View>
          )}
          {estHorsLigne && !hasCachedData ? (
            <EmptyState
              illustration="recettes"
              titre={t('planning.hors_ligne_catalogue_titre')}
              sousTitre={t('planning.hors_ligne_catalogue_soustitre')}
            />
          ) : isLoading ? (
            <SkeletonRecetteCard accessibilityLabel={t('planning.chargement_recettes')} />
          ) : isError && !hasCachedData ? (
            <EmptyState
              illustration="recettes"
              titre={t('planning.erreur_recettes_titre')}
              sousTitre={t('planning.erreur_recettes_soustitre')}
              ctaLabel={t('commun.reessayer')}
              onCta={() => void refetch()}
              ctaLoading={isRefetching}
            />
          ) : isCatalogueEmpty ? (
            <EmptyState
              illustration="recettes"
              titre={t('planning.empty_catalogue_titre')}
              sousTitre={t('planning.empty_catalogue_soustitre')}
              ctaLabel={t('planning.actualiser_catalogue')}
              onCta={() => void refetch()}
              ctaLoading={isRefetching}
            />
          ) : isFilteredEmpty ? (
            <EmptyState
              illustration="recettes"
              titre={t('planning.empty_filtres_titre')}
              sousTitre={t('planning.empty_filtres_soustitre')}
              ctaLabel={t('planning.modifier_profil')}
              onCta={() => router.push('/(tabs)/profil')}
            />
          ) : !slotSwipe ? (
            <EmptyState
              illustration="favoris"
              titre={t('planning.tout_planifie_titre')}
              sousTitre={t('planning.swipe_semaine_complete')}
              ctaLabel={t('planning.voir_planning')}
              onCta={() => setSousOnglet('planning')}
            />
          ) : recetteActuelle ? (
            <View style={{ gap: 10 }}>
              {isError && !estHorsLigne ? (
                <CatalogueNotice message={t('planning.cache_non_actualise')} onRetry={() => void refetch()} />
              ) : null}
              {allergiesNonReconnues.length > 0 && (
                <Caption style={{ color: colors.warning, textAlign: 'center' }}>
                  {t('planning.allergies_non_reconnues', { allergies: allergiesNonReconnues.join(', ') })}
                </Caption>
              )}
              <SelecteurRepasSwipe
                planning={planning}
                semaineDebut={semaineAffichee}
                selection={slotSwipe}
                portions={portionsSwipe ?? profil?.nb_personnes ?? 1}
                onSelectionChange={selectionnerSlotSwipe}
                onPortionsChange={setPortionsSwipe}
                onChangerSemaine={changerSemaine}
                onIgnorer={() => {
                  void haptics.selection();
                  void ignorer(slotSwipe.jour, slotSwipe.moment);
                  setSelectionSwipeManuelle(null);
                  setPortionsSwipe(null);
                  if (estHorsLigne) toast.info(t('planning.sauvegarde_hors_ligne'));
                }}
              />
              <SwipeRecette
                key={recetteActuelle.id}
                recette={recetteActuelle}
                recetteSuivante={recettes[indexCourant + 1]}
                profilId={profil?.id ?? 'demo-user'}
                alerteAllergenes={alertesParRecette[recetteActuelle.id]}
                onTapDetail={() => router.push(`/recette/${recetteActuelle.id}`)}
                compact={height < 900}
                onSwiped={(aime) => {
                  enregistrerSwipe(recetteActuelle.id, aime);
                  if (aime) {
                    const portionsFoyer = profil?.nb_personnes ?? 1;
                    const portionsSelectionnees = portionsSwipe ?? portionsFoyer;
                    void assigner(slotSwipe.jour, slotSwipe.moment, {
                      recette: recetteActuelle,
                      portions: portionsSelectionnees !== portionsFoyer ? portionsSelectionnees : undefined,
                    });
                    setSelectionSwipeManuelle(null);
                    setPortionsSwipe(null);
                    if (estHorsLigne) toast.info(t('planning.sauvegarde_hors_ligne'));
                  }
                  avancerRecette();
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
        <ScreenScroll style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingBottom: 120 }} padded>
          {estHorsLigne && <OfflineBannerView visible />}
          <View
            accessibilityRole="summary"
            style={{ padding: 16, gap: 6, borderRadius: 20, backgroundColor: colors.bgWarm }}
          >
            <Subheading>{t('planning.progression', { count: nombreCreneauxDecides, total: 14 })}</Subheading>
            <View style={{ height: 8, overflow: 'hidden', borderRadius: 999, backgroundColor: colors.border }}>
              <View style={{ width: `${Math.round((nombreCreneauxDecides / 14) * 100)}%`, height: 8, backgroundColor: colors.primary }} />
            </View>
            {synchronisationsEnAttente > 0 ? (
              <Caption accessibilityLiveRegion="polite">
                {t('planning.synchronisations_attente', { count: synchronisationsEnAttente })}
              </Caption>
            ) : null}
          </View>
          <View style={{ gap: 8 }}>
            <Button
              testID="planning-autofill"
              label={t('planning.remplir_favoris')}
              onPress={() => void remplirAvecFavoris()}
              disabled={planningMutationEnCours || recettesAimees.length === 0 || nombreCreneauxDecides === 14}
              accessibilityHint={t('planning.remplir_favoris_hint')}
            />
            {recettesAimees.length === 0 ? <Caption>{t('planning.favoris_requis')}</Caption> : null}
            {peutAnnuler ? (
              <Button
                testID="planning-undo"
                label={t('planning.annuler_derniere_action')}
                variant="ghost"
                onPress={() => void annulerDerniereAction()}
                disabled={planningMutationEnCours}
              />
            ) : null}
          </View>
          {estHorsLigne && !planningEnCache ? (
            <EmptyState
              illustration="planning"
              titre={t('planning.hors_ligne_planning_titre')}
              sousTitre={t('planning.hors_ligne_planning_soustitre')}
            />
          ) : planningEnChargement ? (
            <SkeletonPlanningJour />
          ) : planningEnErreur && !planningEnCache ? (
            <EmptyState
              illustration="planning"
              titre={t('planning.erreur_planning_titre')}
              sousTitre={t('planning.erreur_planning_soustitre')}
              ctaLabel={t('commun.reessayer')}
              onCta={() => void rafraichirPlanning()}
              ctaLoading={planningEnRafraichissement}
            />
          ) : (
            <>
              {planningEnErreur && !estHorsLigne ? (
                <CatalogueNotice message={t('planning.planning_cache_non_actualise')} onRetry={() => void rafraichirPlanning()} />
              ) : null}
              {!prochainSlot && (
                <EmptyState illustration="favoris" titre={t('planning.tout_planifie_titre')} sousTitre={t('planning.tout_planifie_soustitre')} />
              )}
              <PlanningSemaine
                planning={planning}
                semaineDebut={semaineAffichee}
                jourInitial={prochainSlot?.jour ?? (semaineActuelle ? dates.jourSemaine(dates.maintenant()) : 'lundi')}
                onPressSlot={(jour, moment) => ouvrirChoixSlot(jour, moment)}
                onIgnorer={(jour, moment) => {
                  void haptics.selection();
                  void ignorer(jour, moment);
                }}
                onRetirer={(jour, moment) => {
                  void haptics.selection();
                  void retirer(jour, moment);
                }}
                onChangerSemaine={changerSemaine}
                onRetourAujourdhui={() => setSemaineAffichee(dates.debutSemaine(dates.maintenant()))}
              />
              <Button
                testID="planning-create-shopping-list"
                label={t('planning.creer_liste_courses', { count: nombreRepasPlanifies })}
                variant="secondary"
                onPress={creerListeCourses}
                disabled={nombreRepasPlanifies === 0}
                accessibilityHint={t('planning.creer_liste_courses_hint')}
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
          <DisplayLG>{repasSlotChoix && !modeChoixRecette ? t('planning.modifier_repas') : t('planning.choisir_recette')}</DisplayLG>

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

          {repasSlotChoix && slotChoix && !modeChoixRecette ? (
            <View style={{ gap: 12 }}>
              <RecetteCard recette={repasSlotChoix.recette} />
              <Button
                label={t('planning.enregistrer_portions')}
                onPress={() => {
                  const portionsFoyer = profil?.nb_personnes ?? 1;
                  const portionsFinales = membresChoisisIds.length > 0 ? membresChoisisIds.length : (portionsChoix ?? portionsFoyer);
                  void assigner(slotChoix.jour, slotChoix.moment, {
                    recette: repasSlotChoix.recette,
                    portions: portionsFinales !== portionsFoyer ? portionsFinales : undefined,
                    membreIds: membresChoisisIds.length > 0 ? membresChoisisIds : undefined,
                  });
                  setSlotChoix(null);
                }}
              />
              <Button label={t('planning.remplacer_recette')} variant="secondary" onPress={() => setModeChoixRecette(true)} />
              <Button
                label={t('planning.deplacer_repas')}
                variant="secondary"
                onPress={() => {
                  setDeplacementOuvert((ouvert) => !ouvert);
                  setDestinationDeplacement(null);
                }}
              />

              {deplacementOuvert ? (
                <View style={{ gap: 10, padding: 12, borderRadius: 16, backgroundColor: colors.bgWarm }}>
                  <Subheading>{t('planning.deplacer_vers')}</Subheading>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {JOURS_SEMAINE.map((jour) => {
                      const selectionne = destinationDeplacement?.jour === jour;
                      return (
                        <Pressable
                          key={jour}
                          onPress={() => setDestinationDeplacement({ jour, moment: destinationDeplacement?.moment ?? slotChoix.moment })}
                          accessibilityRole="button"
                          accessibilityState={{ selected: selectionne }}
                          style={{
                            minHeight: 44,
                            paddingHorizontal: 12,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: selectionne ? colors.primary : colors.bgSecondary,
                          }}
                        >
                          <BodySm style={{ color: selectionne ? '#FFFFFF' : colors.textPrimary }}>
                            {t(`planning.jour_${jour}`).slice(0, 3)}
                          </BodySm>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['midi', 'soir'] as const).map((moment) => {
                      const selectionne = destinationDeplacement?.moment === moment;
                      return (
                        <Pressable
                          key={moment}
                          onPress={() => setDestinationDeplacement({ jour: destinationDeplacement?.jour ?? slotChoix.jour, moment })}
                          accessibilityRole="button"
                          accessibilityState={{ selected: selectionne }}
                          style={{
                            flex: 1,
                            minHeight: 44,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: selectionne ? colors.primary : colors.bgSecondary,
                          }}
                        >
                          <BodySm style={{ color: selectionne ? '#FFFFFF' : colors.textPrimary }}>{t(`planning.slot_${moment}`)}</BodySm>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Button
                    label={t('planning.confirmer_deplacement')}
                    disabled={!destinationDeplacement}
                    onPress={() => {
                      if (!destinationDeplacement) return;
                      void deplacer(slotChoix, destinationDeplacement, repasSlotChoix);
                      setSlotChoix(null);
                    }}
                  />
                  {destinationDeplacement && planning[destinationDeplacement.jour][destinationDeplacement.moment] ? (
                    <Caption style={{ color: colors.warning, textAlign: 'center' }}>
                      {t('planning.deplacement_remplace', {
                        titre: planning[destinationDeplacement.jour][destinationDeplacement.moment]?.recette.titre ?? '',
                      })}
                    </Caption>
                  ) : null}
                </View>
              ) : null}

              <Pressable
                onPress={() => {
                  void retirer(slotChoix.jour, slotChoix.moment);
                  setSlotChoix(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('planning.supprimer_repas')}
                style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <BodySm style={{ color: colors.error, fontWeight: '600' }}>{t('planning.supprimer_repas')}</BodySm>
              </Pressable>
            </View>
          ) : null}

          {allergiesMembresNonReconnues.length > 0 && (
            <Caption style={{ color: colors.warning }}>
              {t('planning.allergies_non_reconnues', { allergies: allergiesMembresNonReconnues.join(', ') })}
            </Caption>
          )}

          {(modeChoixRecette || !repasSlotChoix) && (recettesAimees.length === 0 ? (
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
                  if (slotChoix) {
                    const portionsFoyer = profil?.nb_personnes ?? 1;
                    const portionsFinales = membresChoisisIds.length > 0 ? membresChoisisIds.length : (portionsChoix ?? portionsFoyer);
                    void assigner(slotChoix.jour, slotChoix.moment, {
                      recette: r,
                      portions: portionsFinales !== portionsFoyer ? portionsFinales : undefined,
                      membreIds: membresChoisisIds.length > 0 ? membresChoisisIds : undefined,
                    });
                    if (estHorsLigne) toast.info(t('planning.sauvegarde_hors_ligne'));
                  }
                  setSlotChoix(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('planning.assigner_label', { titre: r.titre })}
              >
                <RecetteCard recette={r} alerteAllergenes={alertesMembresParRecette[r.id]} />
              </Pressable>
            ))
          ))}
          <Button label={t('commun.fermer')} variant="secondary" onPress={() => setSlotChoix(null)} />
        </ScreenScroll>
      </Modal>
    </Screen>
  );
}
