/** Detail recette — deep-linkable via courseo://recette/[id] (partage social). */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';
import { DisplayLG, Heading, Body, BodySm, Price, Data } from '@/components/ui/Typography';
import { formatCalories, formatPrix, formatTemps } from '@/lib/format';

export default function DetailRecette() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const recette = RECETTES_MOCK.find((r) => r.id === id);

  if (!recette) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Body>Recette introuvable</Body>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Image source={{ uri: recette.image_url }} placeholder={recette.blurhash} contentFit="cover" transition={200} style={{ width: '100%', height: 260 }} accessibilityLabel={`Photo de ${recette.titre}`} />
      <View style={{ padding: 20, gap: 12 }}>
        <DisplayLG>{recette.titre}</DisplayLG>
        <Body>{recette.description}</Body>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Data>{formatTemps(recette.temps_preparation)}</Data>
          <Data>{formatCalories(recette.calories)}</Data>
          <Price>{formatPrix(recette.cout_estime)}</Price>
        </View>

        <Heading>Ingrédients</Heading>
        {recette.ingredients.map((ing) => (
          <BodySm key={ing.nom}>• {ing.quantite}{ing.unite} {ing.nom}</BodySm>
        ))}

        <Heading>Étapes</Heading>
        {recette.etapes.map((etape, i) => (
          <BodySm key={i}>{i + 1}. {etape}</BodySm>
        ))}
      </View>
    </ScrollView>
  );
}
