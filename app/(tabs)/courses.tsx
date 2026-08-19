/** Courses — liste générée, mode d'optimisation, récapitulatif panier. */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SlidersHorizontal, ShoppingBasket } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { useCoursesSync } from '@/hooks/useCoursesSync';
import { useAbonnement } from '@/hooks/useAbonnement';
import { useCoursesStore } from '@/stores/coursesStore';
import { usePanierStore } from '@/stores/panierStore';
import { useProfilStore } from '@/stores/profilStore';
import { supabase } from '@/lib/supabase';
import { ListeCourses } from '@/components/courses/ListeCourses';
import { AjouterArticle } from '@/components/courses/AjouterArticle';
import { StatutSynchronisation } from '@/components/courses/StatutSynchronisation';
import { OptimisationCourses } from '@/components/courses/OptimisationCourses';
import { RecapCommande } from '@/components/panier/RecapCommande';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonListeCourses } from '@/components/ui/Skeleton';
import { PaywallModal } from '@/components/ui/PaywallModal';
import { ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Heading, BodySm, Subheading } from '@/components/ui/Typography';
import { toast } from '@/lib/toast';
import { analytics } from '@/lib/analytics';
import { t } from '@/lib/i18n';
import { useSwissGroceriesEligibility } from '@/hooks/useSwissGroceriesEligibility';
import { usePreferencesCourses } from '@/hooks/usePreferencesCourses';
import { router } from 'expo-router';
import { usePanierLiveStore } from '@/stores/panierLiveStore';
import type { ModeOptimisation, NiveauAbonnement } from '@/types';

const MODES: { id: ModeOptimisation; label: string }[] = [
  { id: 'prix_minimum', label: t('courses.mode_prix_minimum') },
  { id: 'equilibre', label: t('courses.mode_equilibre') },
  { id: 'premium', label: t('courses.mode_premium') },
  { id: 'bio', label: t('courses.mode_bio') },
  { id: 'sante', label: t('courses.mode_sante') },
];

export default function Courses() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { items, toggleCoche, ajouterItemLibre, retirerItem } = useCoursesStore();
  const { mode, recap, setMode, calculer } = usePanierStore();
  const profil = useProfilStore((s) => s.profil);
  const { estAuMoins } = useAbonnement();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [hydrated, setHydrated] = useState(useCoursesStore.persist.hasHydrated());
  const synchronisation = useCoursesSync();
  const { eligible: swissGroceriesEligible } = useSwissGroceriesEligibility();
  const preferencesCourses = usePreferencesCourses(profil?.id);
  const creerPanierLive = usePanierLiveStore((state) => state.creerDepuisOptimisation);

  useEffect(() => {
    if (hydrated) return;
    return useCoursesStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  useEffect(() => {
    if (items.length > 0 && !swissGroceriesEligible) calculer(items);
  }, [items, calculer, swissGroceriesEligible]);

  useEffect(() => {
    // Le MCP ne propose pas encore de score nutritionnel fiable. Un ancien
    // mode "sante" persiste repasse donc sur l'equilibre, sans fausse promesse.
    if (swissGroceriesEligible && mode === 'sante') setMode('equilibre');
  }, [mode, setMode, swissGroceriesEligible]);

  const validerCommande = async () => {
    if (!recap || !profil) return;
    const { error } = await supabase.from('commandes').insert({
      profil_id: profil.id,
      paniers: recap.paniers,
      montant_total: recap.montant_total,
      economies: recap.economies,
    });
    if (error) {
      toast.erreur(t('courses.erreur_validation'));
      return;
    }
    toast.economies(recap.economies);
  };

  const choisirMode = (id: ModeOptimisation) => {
    if (id !== 'prix_minimum' && !estAuMoins('standard')) {
      setPaywallVisible(true);
      return;
    }
    void haptics.selection();
    setMode(id);
  };

  if (!hydrated) {
    return (
      <ScreenScroll contentContainerStyle={{ gap: 22 }}>
        <DisplayLG>{t('tabs.courses')}</DisplayLG>
        <SkeletonListeCourses />
      </ScreenScroll>
    );
  }

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <OfflineBanner />
        <ScreenScroll contentContainerStyle={{ gap: 22, justifyContent: 'center', flexGrow: 1 }}>
          <StatutSynchronisation
            estConnecte={synchronisation.estConnecte}
            syncing={synchronisation.syncing}
            syncEnAttente={synchronisation.syncEnAttente}
            erreur={synchronisation.erreurSynchronisation}
            onReessayer={synchronisation.reessayer}
          />
          <EmptyState
            illustration="courses"
            titre={t('courses.empty_titre')}
            sousTitre={t('courses.empty_soustitre')}
          />
          <AjouterArticle onAjouter={ajouterItemLibre} />
        </ScreenScroll>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <OfflineBanner />
      <ScreenScroll contentContainerStyle={{ gap: 22 }}>
        <View>
          <DisplayLG>{t('tabs.courses')}</DisplayLG>
          <BodySm>{t('courses.sous_titre')}</BodySm>
        </View>

        <StatutSynchronisation
          estConnecte={synchronisation.estConnecte}
          syncing={synchronisation.syncing}
          syncEnAttente={synchronisation.syncEnAttente}
          erreur={synchronisation.erreurSynchronisation}
          onReessayer={synchronisation.reessayer}
        />

        <LinearGradient
          colors={[colors.primaryDark, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 28, padding: 20, gap: 14 }}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: 'rgba(255,255,255,0.16)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBasket size={24} color="#FFFFFF" />
          </View>
          <View>
            <Heading style={{ color: '#FFFFFF' }}>
              {t('courses.articles_a_verifier', { count: items.length })}
            </Heading>
            <BodySm style={{ color: 'rgba(255,255,255,0.78)' }}>{t('courses.hero_message')}</BodySm>
          </View>
        </LinearGradient>

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SlidersHorizontal size={18} color={colors.primary} />
            <Subheading>{t('courses.mode_optimisation')}</Subheading>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {MODES.filter((m) => !swissGroceriesEligible || m.id !== 'sante').map((m) => (
              <Pressable
                key={m.id}
                onPress={() => choisirMode(m.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m.id }}
                style={{
                  minHeight: 44,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 9999,
                  backgroundColor: mode === m.id ? colors.primary : colors.bgSecondary,
                  marginRight: 8,
                }}
              >
                <Subheading style={{ color: mode === m.id ? '#FFFFFF' : colors.textPrimary }}>
                  {m.label}
                </Subheading>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <AjouterArticle onAjouter={ajouterItemLibre} />

        <ListeCourses
          items={items}
          onToggle={toggleCoche}
          onSupprimer={retirerItem}
          onChoisirPalier={(palier) => analytics.subscriptionStarted(palier)}
        />

        {swissGroceriesEligible ? (
          <OptimisationCourses
            items={items}
            mode={mode}
            enseignesFavorites={profil?.enseignes_favorites ?? []}
            preferences={preferencesCourses.data}
            estStandard={estAuMoins('standard')}
            onDebloquer={() => setPaywallVisible(true)}
            onPreparerPaniers={(resultat, option, npa) => {
              creerPanierLive(resultat, option, npa);
              router.push('/panier-en-ligne');
            }}
          />
        ) : null}

        {!swissGroceriesEligible && recap && (
          <RecapCommande recap={recap} onValider={() => void validerCommande()} />
        )}
      </ScreenScroll>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onChoisir={(palier: NiveauAbonnement) => {
          analytics.subscriptionStarted(palier);
          setPaywallVisible(false);
        }}
        featureOrigine="courses"
      />
    </View>
  );
}
