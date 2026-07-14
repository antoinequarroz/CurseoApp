/** Planifier — onglets Recettes | Planning | Communauté. */
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { useRecettes } from '@/hooks/useRecettes';
import { useProfilStore } from '@/stores/profilStore';
import { usePlanningStore } from '@/stores/planningStore';
import { SwipeRecette } from '@/components/recettes/SwipeRecette';
import { RecetteCard } from '@/components/recettes/RecetteCard';
import { PlanningHebdo } from '@/components/planning/PlanningHebdo';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRecetteCard } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Subheading, Caption } from '@/components/ui/Typography';
import { analytics } from '@/lib/analytics';
import type { JourSemaine, Recette } from '@/types';

type SousOnglet = 'recettes' | 'planning' | 'communaute';

function SegmentedControl({ valeur, onChange }: { valeur: SousOnglet; onChange: (v: SousOnglet) => void }) {
  const { colors } = useTheme();
  const options: { id: SousOnglet; label: string }[] = [
    { id: 'recettes', label: 'Recettes' },
    { id: 'planning', label: 'Planning' },
    { id: 'communaute', label: 'Communauté' },
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
  const profil = useProfilStore((s) => s.profil);
  const { planning, assignerRecette } = usePlanningStore();
  const [sousOnglet, setSousOnglet] = useState<SousOnglet>('recettes');
  const [indexCourant, setIndexCourant] = useState(0);
  const [recettesAimees, setRecettesAimees] = useState<Recette[]>([]);
  const [slotChoix, setSlotChoix] = useState<{ jour: JourSemaine; moment: 'midi' | 'soir' } | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage } = useRecettes({ regime: profil?.regime });
  const recettes = useMemo(() => data?.pages.flat() ?? [], [data]);
  const recetteActuelle = recettes[indexCourant];

  const genererSemaineIA = () => {
    void haptics.success();
    const joursOrdre: JourSemaine[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    joursOrdre.forEach((jour, i) => {
      const recette = recettesAimees[i % Math.max(recettesAimees.length, 1)];
      if (recette) assignerRecette(jour, 'midi', recette);
    });
    analytics.planningGenerated();
  };

  return (
    <Screen padded={false} bottomInset={false}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <View>
          <Caption>Menus de la semaine</Caption>
          <DisplayLG>Planifier</DisplayLG>
        </View>
        <SegmentedControl valeur={sousOnglet} onChange={setSousOnglet} />
      </View>

      {sousOnglet === 'recettes' && (
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 96, justifyContent: 'center' }}>
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
              titre="Tu as vu toutes les recettes"
              sousTitre="Passe au planning pour organiser tes favoris."
              ctaLabel="Voir mon planning"
              onCta={() => setSousOnglet('planning')}
            />
          )}
        </View>
      )}

      {sousOnglet === 'planning' && (
        <ScreenScroll style={{ flex: 1 }} contentContainerStyle={{ gap: 16 }} padded>
          <Button label="Générer la semaine avec l'IA" onPress={genererSemaineIA} />
          <PlanningHebdo planning={planning} onPressSlot={(jour, moment) => setSlotChoix({ jour, moment })} />
        </ScreenScroll>
      )}

      {sousOnglet === 'communaute' && (
        <View style={{ flex: 1 }}>
          <EmptyState
            illustration="recherche"
            titre="Communauté bientôt disponible"
            sousTitre="Les recettes partagées par d'autres foyers arrivent prochainement."
          />
        </View>
      )}

      <Modal visible={!!slotChoix} animationType="slide" onRequestClose={() => setSlotChoix(null)}>
        <ScreenScroll contentContainerStyle={{ gap: 12 }} tabBar={false}>
          <DisplayLG>Choisir une recette</DisplayLG>
          {recettesAimees.length === 0 ? (
            <EmptyState illustration="favoris" titre="Pas encore de favoris" sousTitre="Swipe vers la droite sur les recettes que tu aimes." />
          ) : (
            recettesAimees.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => {
                  if (slotChoix) assignerRecette(slotChoix.jour, slotChoix.moment, r);
                  setSlotChoix(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Assigner ${r.titre}`}
              >
                <RecetteCard recette={r} />
              </Pressable>
            ))
          )}
          <Button label="Fermer" variant="secondary" onPress={() => setSlotChoix(null)} />
        </ScreenScroll>
      </Modal>
    </Screen>
  );
}
