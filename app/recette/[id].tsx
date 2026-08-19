/** Detail recette — deep-linkable via coursia://recette/[id] (partage social). */
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChefHat, Clock3, Flag, Flame, ShieldCheck, WalletCards } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';
import { fetchRecetteParId } from '@/lib/recettesRepository';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DisplayLG, Heading, Body, BodySm, Price, Data, Caption, Subheading } from '@/components/ui/Typography';
import { formatCalories, formatPrix, formatQuantite, formatTemps } from '@/lib/format';
import { SignalerRecetteModal } from '@/components/recettes/SignalerRecetteModal';
import { t } from '@/lib/i18n';
import { equipementsManquants, equipementsRequisDe } from '@/lib/equipementsCuisine';
import { useProfilStore } from '@/stores/profilStore';

export default function DetailRecette() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const profil = useProfilStore((state) => state.profil);
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
  const allergenesConfirmes = recette?.allergenesEffectifs?.filter((allergene) => allergene.certitude === 'confirme') ?? [];
  const allergenesPossibles = recette?.allergenesEffectifs?.filter((allergene) => allergene.certitude === 'possible') ?? [];
  const equipementsRequis = recette ? equipementsRequisDe(recette) : [];
  const equipementsAbsents = recette ? equipementsManquants(recette, profil?.equipements_cuisine) : [];

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
        <View style={{ gap: 6 }}>
          {recette.est_communautaire && <Badge label={t('recettes.badge_communautaire')} variant="neutral" />}
          <DisplayLG>{recette.titre}</DisplayLG>
          <Body style={{ color: colors.textSecondary, marginTop: 4 }}>{recette.description}</Body>
        </View>

        <Card style={{ flexDirection: 'row', padding: 16, gap: 12, justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 5 }}>
            <Clock3 size={18} color={colors.primary} accessible={false} />
            <Caption>{t('recettes.temps_indicatif')}</Caption>
            <Data>{formatTemps(recette.temps_preparation)}</Data>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Flame size={18} color={colors.primary} accessible={false} />
            <Caption>{t('recettes.calories_estimees')}</Caption>
            <Data>≈ {formatCalories(recette.calories)}</Data>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <WalletCards size={18} color={colors.primary} accessible={false} />
            <Caption>{t('recettes.budget_estime')}</Caption>
            <Price>≈ {formatPrix(recette.cout_estime)}</Price>
          </View>
        </Card>

        <Card style={{ padding: 18, gap: 10, backgroundColor: colors.bgWarm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {allergenesConfirmes.length > 0 || allergenesPossibles.length > 0 ? (
              <AlertTriangle size={20} color={colors.warning} accessible={false} />
            ) : (
              <ShieldCheck size={20} color={colors.primary} accessible={false} />
            )}
            <Heading>{t('recettes.allergenes_titre')}</Heading>
          </View>
          {allergenesConfirmes.length > 0 ? (
            <BodySm>{t('recettes.allergenes_confirmes', { allergenes: allergenesConfirmes.map((a) => a.libelle).join(', ') })}</BodySm>
          ) : null}
          {allergenesPossibles.length > 0 ? (
            <BodySm>{t('recettes.allergenes_possibles', { allergenes: allergenesPossibles.map((a) => a.libelle).join(', ') })}</BodySm>
          ) : null}
          {allergenesConfirmes.length === 0 && allergenesPossibles.length === 0 ? (
            <BodySm>{t('recettes.allergenes_non_garanti')}</BodySm>
          ) : null}
          <Caption>{t('recettes.disclaimer_allergenes')}</Caption>
        </Card>

        <Card style={{ padding: 18, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ChefHat size={20} color={equipementsAbsents.length > 0 ? colors.warning : colors.primary} accessible={false} />
            <Heading>{t('recettes.equipements_titre')}</Heading>
          </View>
          {equipementsRequis.length === 0 ? (
            <BodySm>{t('recettes.equipements_aucun')}</BodySm>
          ) : (
            <BodySm>{equipementsRequis.map((id) => t(`equipements.${id}`)).join(' · ')}</BodySm>
          )}
          {profil?.equipements_cuisine != null && equipementsRequis.length > 0 ? (
            equipementsAbsents.length > 0 ? (
              <Badge
                label={t('recettes.equipement_manquant', {
                  equipements: equipementsAbsents.map((id) => t(`equipements.${id}`)).join(', '),
                })}
                variant="warning"
              />
            ) : (
              <BodySm style={{ color: colors.primary }}>{t('recettes.equipements_compatibles')}</BodySm>
            )
          ) : null}
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
            <View key={`${i}-${etape}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 5 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}>
                <Subheading>{i + 1}</Subheading>
              </View>
              <BodySm style={{ flex: 1, paddingTop: 4 }}>{etape}</BodySm>
            </View>
          ))}
        </Card>

        <Card style={{ padding: 18, gap: 6 }}>
          <Heading>{t('recettes.transparence_titre')}</Heading>
          <BodySm>{t('recettes.estimations_explication')}</BodySm>
          <Caption selectable>{recette.source ?? t('recettes.source_coursia')}</Caption>
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
