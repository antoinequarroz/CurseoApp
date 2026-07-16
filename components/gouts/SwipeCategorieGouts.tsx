/**
 * Deck de swipe pour une categorie de gouts — reutilise SwipeRecette (qui
 * ecrit deja dans la table `swipes`) et journalise en plus localement pour
 * savoir quelles categories sont "cernees".
 */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useGoutsStore } from '@/stores/goutsStore';
import { SwipeRecette } from '@/components/recettes/SwipeRecette';
import { EmptyState } from '@/components/ui/EmptyState';
import { Caption } from '@/components/ui/Typography';
import { categoriserRecette } from '@/lib/gouts';
import { t } from '@/lib/i18n';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';
import type { CategorieGout } from '@/types';

export function SwipeCategorieGouts({ categorie, profilId }: { categorie: CategorieGout; profilId: string }) {
  const swipes = useGoutsStore((s) => s.swipes);
  const enregistrerSwipe = useGoutsStore((s) => s.enregistrerSwipe);
  const [index, setIndex] = useState(0);

  const recettesCategorie = useMemo(
    () => RECETTES_MOCK.filter((r) => categoriserRecette(r) === categorie),
    [categorie],
  );
  const recettesRestantes = useMemo(
    () => recettesCategorie.filter((r) => swipes[r.id] === undefined),
    [recettesCategorie, swipes],
  );
  const recetteActuelle = recettesRestantes[index % Math.max(recettesRestantes.length, 1)];
  const nbAimees = recettesCategorie.filter((r) => swipes[r.id] === true).length;

  if (recettesCategorie.length === 0 || !recetteActuelle) {
    return (
      <View style={{ paddingVertical: 24 }}>
        <EmptyState
          illustration="favoris"
          titre={t('gouts.categorie_cernee_titre')}
          sousTitre={t('gouts.categorie_cernee_soustitre', { count: nbAimees })}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Caption>{t('gouts.categorie_progression', { restant: recettesRestantes.length, total: recettesCategorie.length })}</Caption>
      <SwipeRecette
        recette={recetteActuelle}
        profilId={profilId}
        onTapDetail={() => router.push(`/recette/${recetteActuelle.id}`)}
        onSwiped={(aime) => {
          enregistrerSwipe(recetteActuelle.id, aime);
          setIndex((i) => i + 1);
        }}
      />
    </View>
  );
}
