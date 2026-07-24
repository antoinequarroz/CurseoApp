/** Detail recette — deep-linkable via coursia://recette/[id] (partage social). */
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Flag } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';
import { fetchRecetteParId } from '@/lib/recettesRepository';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { DisplayLG, Heading, Body, BodySm, Price, Data } from '@/components/ui/Typography';
import { formatCalories, formatPrix, formatQuantite, formatTemps } from '@/lib/format';
import { SignalerRecetteModal } from '@/components/recettes/SignalerRecetteModal';

export default function DetailRecette() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [signalementVisible, setSignalementVisible] = useState(false);

  // RECETTES_MOCK reste la source pour les recettes communautaires (COUR-18 :
  // hors perimetre du catalogue Supabase) et le dev sans backend — verifie
  // en premier (synchrone). Sinon, la recette vient forcement du catalogue
  // reel (COUR-19) : on va la chercher par id sur Supabase.
  const recetteMock = RECETTES_MOCK.find((r) => r.id === id);
  const requeteSupabase = useQuery({
    queryKey: ['recette', id],
    queryFn: () => fetchRecetteParId(id!),
    enabled: !recetteMock && isSupabaseConfigured && Boolean(id),
    staleTime: 1000 * 60 * 10,
  });

  const recette = recetteMock ?? requeteSupabase.data;

  if (!recetteMock && requeteSupabase.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!recette) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Body>Recette introuvable</Body>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Image
        source={{ uri: recette.image_url }}
        placeholder={recette.blurhash}
        contentFit="cover"
        transition={200}
        style={{ width: '100%', height: 260, borderRadius: 24 }}
        accessibilityLabel={`Photo de ${recette.titre}`}
      />
      <View style={{ padding: 20, gap: 16 }}>
        <View>
          <DisplayLG>{recette.titre}</DisplayLG>
          <Body style={{ color: colors.textSecondary, marginTop: 4 }}>{recette.description}</Body>
        </View>

        <Card style={{ flexDirection: 'row', padding: 16, justifyContent: 'space-between' }}>
          <Data>{formatTemps(recette.temps_preparation)}</Data>
          <Data>{formatCalories(recette.calories)}</Data>
          <Price>{formatPrix(recette.cout_estime)}</Price>
        </Card>

        <Card style={{ padding: 18, gap: 8 }}>
          <Heading>Ingrédients</Heading>
          {recette.ingredients.map((ing) => (
            <BodySm key={ing.nom}>• {formatQuantite(ing.quantite, ing.unite)} {ing.nom}</BodySm>
          ))}
        </Card>

        <Card style={{ padding: 18, gap: 8 }}>
          <Heading>Étapes</Heading>
          {recette.etapes.map((etape, i) => (
            <BodySm key={i}>{i + 1}. {etape}</BodySm>
          ))}
        </Card>

        <Pressable
          onPress={() => setSignalementVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Signaler cette recette"
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 8, padding: 8 }}
        >
          <Flag size={14} color={colors.textMuted} />
          <BodySm>Signaler cette recette</BodySm>
        </Pressable>
      </View>

      <SignalerRecetteModal
        visible={signalementVisible}
        onClose={() => setSignalementVisible(false)}
        recetteId={recette.id}
      />
    </ScrollView>
  );
}
