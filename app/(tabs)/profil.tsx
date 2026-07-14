/** Profil — infos foyer, abonnement, notifications, apparence, suppression de compte. */
import React, { useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, Crown, Home, Palette, ShieldAlert, UserRound } from 'lucide-react-native';
import { useTheme, type ApparencePreference } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { supabase } from '@/lib/supabase';
import { PALIERS_ABONNEMENT } from '@/lib/revenuecat';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Heading, Body, BodySm, Caption } from '@/components/ui/Typography';
import { toast } from '@/lib/toast';

function LigneNotification({ label, valeur, onChange }: { label: string; valeur: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
      <Body>{label}</Body>
      <Switch value={valeur} onValueChange={onChange} trackColor={{ true: colors.primary }} />
    </View>
  );
}

export default function Profil() {
  const { colors, preference, setPreference } = useTheme();
  const { profil, mettreAJourPreferences, reset } = useProfilStore();
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const [emailSaisi, setEmailSaisi] = useState('');

  const profilAffiche = profil ?? {
    id: 'demo-user',
    prenom: 'Ton foyer',
    nb_personnes: 1,
    nb_enfants: 0,
    budget_hebdo: 150,
    regime: [],
    allergies: [],
    objectifs: [],
    enseignes_favorites: [],
    abonnement: 'gratuit' as const,
    notifications_activees: true,
    notifications_planning: true,
    notifications_budget: true,
    notifications_promos: false,
    notifications_bilan: true,
    apparence: 'auto' as const,
    cgvu_version_acceptee: null,
  };

  const supprimerCompte = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.erreur('Session introuvable');
      return;
    }
    await supabase.functions.invoke('delete-account', { body: { userId: session.session.user.id } });
    reset();
    useOnboardingStore.getState().reset();
    router.replace('/(auth)/connexion');
  };

  const apparenceOptions: { id: ApparencePreference; label: string }[] = [
    { id: 'auto', label: 'Auto' },
    { id: 'clair', label: 'Clair' },
    { id: 'sombre', label: 'Sombre' },
  ];

  return (
    <ScreenScroll contentContainerStyle={{ gap: 22 }}>
      <View>
        <Caption>Paramètres</Caption>
        <DisplayLG>Profil</DisplayLG>
      </View>

      <Card style={{ padding: 20, gap: 14, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}>
            <UserRound size={22} color={colors.primary} />
          </View>
          <View>
            <Heading>Informations du foyer</Heading>
            <Caption>Nom, taille du foyer et préférences</Caption>
          </View>
        </View>
        <TextInput
          value={profilAffiche.prenom}
          onChangeText={(v) => mettreAJourPreferences({ prenom: v })}
          accessibilityLabel="Prénom"
          style={{
            color: colors.textPrimary,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
        <BodySm>{profilAffiche.nb_personnes} personne(s), dont {profilAffiche.nb_enfants} enfant(s)</BodySm>
      </Card>

      <Card style={{ padding: 20, gap: 12, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}>
            <Crown size={22} color={colors.primary} />
          </View>
          <Heading>Abonnement</Heading>
        </View>
        {PALIERS_ABONNEMENT.map((p) => (
          <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Body style={{ fontWeight: profilAffiche.abonnement === p.id ? '700' : '400' }}>{p.nom}</Body>
            <Caption>{p.prix}</Caption>
          </View>
        ))}
      </Card>

      <Card style={{ padding: 20, gap: 10, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}>
            <Palette size={22} color={colors.primary} />
          </View>
          <Heading>Apparence</Heading>
        </View>
        <Caption>Suit les préférences système ou force un thème.</Caption>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {apparenceOptions.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => setPreference(o.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: preference === o.id }}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
                backgroundColor: preference === o.id ? colors.primary : colors.bgSecondary,
              }}
            >
              <BodySm style={{ color: preference === o.id ? '#FFFFFF' : colors.textPrimary }}>{o.label}</BodySm>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ padding: 20, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={22} color={colors.primary} />
          </View>
          <Heading>Notifications</Heading>
        </View>
        <LigneNotification label="Rappel planning" valeur={profilAffiche.notifications_planning} onChange={(v) => mettreAJourPreferences({ notifications_planning: v })} />
        <LigneNotification label="Alertes budget" valeur={profilAffiche.notifications_budget} onChange={(v) => mettreAJourPreferences({ notifications_budget: v })} />
        <LigneNotification label="Promotions" valeur={profilAffiche.notifications_promos} onChange={(v) => mettreAJourPreferences({ notifications_promos: v })} />
        <LigneNotification label="Bilan hebdomadaire" valeur={profilAffiche.notifications_bilan} onChange={(v) => mettreAJourPreferences({ notifications_bilan: v })} />
      </Card>

      <Card style={{ padding: 20, gap: 8, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}>
            <Home size={22} color={colors.primary} />
          </View>
          <View>
            <Heading>Préférences du foyer</Heading>
            <Caption>{profilAffiche.enseignes_favorites.length || 0} enseigne(s) favorite(s)</Caption>
          </View>
        </View>
        <BodySm>Les préférences détaillées seront enrichies dans la prochaine passe UX.</BodySm>
      </Card>

      {!confirmationSuppression ? (
        <Pressable onPress={() => setConfirmationSuppression(true)} accessibilityRole="button" accessibilityLabel="Supprimer mon compte">
          <BodySm style={{ color: colors.error, textAlign: 'center' }}>Supprimer mon compte</BodySm>
        </Pressable>
      ) : (
        <Card style={{ padding: 18, gap: 12, borderColor: colors.error }}>
          <ShieldAlert size={22} color={colors.error} />
          <Body>Cette action est irréversible. Confirme en saisissant ton email.</Body>
          <TextInput
            value={emailSaisi}
            onChangeText={setEmailSaisi}
            placeholder="Ton email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            accessibilityLabel="Confirme ton email pour supprimer le compte"
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.textPrimary }}
          />
          <Button label="Confirmer la suppression" variant="secondary" onPress={supprimerCompte} disabled={!emailSaisi} />
        </Card>
      )}
    </ScreenScroll>
  );
}
