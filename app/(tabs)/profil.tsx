/** Profil — infos foyer, abonnement, notifications, apparence, suppression de compte. */
import React, { useEffect, useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, ChevronRight, Crown, Home, LogOut, MapPin, Palette, Sparkles, ShieldAlert, UserRound } from 'lucide-react-native';
import { useTheme, type ApparencePreference } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { supabase } from '@/lib/supabase';
import { resetUserStores } from '@/lib/resetSession';
import { PALIERS_ABONNEMENT } from '@/lib/revenuecat';
import { RegimeParPersonneTeaser } from '@/components/ui/RegimeParPersonneTeaser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Heading, Body, BodySm, Caption } from '@/components/ui/Typography';
import { toast } from '@/lib/toast';
import { t } from '@/lib/i18n';

function LigneNotification({ label, valeur, onChange }: { label: string; valeur: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
      <Body>{label}</Body>
      <Switch value={valeur} onValueChange={onChange} trackColor={{ true: colors.primary }} />
    </View>
  );
}

function RowRepliable({
  Icon,
  titre,
  resume,
  ouvert,
  onToggle,
  children,
}: {
  Icon: React.ComponentType<{ size: number; color: string }>;
  titre: string;
  resume?: string;
  ouvert: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Card style={{ padding: 20, borderRadius: 28, borderTopLeftRadius: 28 }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: ouvert }}
        accessibilityLabel={titre}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Heading>{titre}</Heading>
          {resume && <Caption>{resume}</Caption>}
        </View>
        <ChevronRight size={20} color={colors.textMuted} style={{ transform: [{ rotate: ouvert ? '90deg' : '0deg' }] }} />
      </Pressable>
      {ouvert && <View style={{ marginTop: 14, gap: 10 }}>{children}</View>}
    </Card>
  );
}

export default function Profil() {
  const { colors, preference, setPreference } = useTheme();
  const { profil, mettreAJourPreferences } = useProfilStore();
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const [emailSaisi, setEmailSaisi] = useState('');
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [abonnementOuvert, setAbonnementOuvert] = useState(false);
  const [apparenceOuvert, setApparenceOuvert] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const profilAffiche = profil ?? {
    id: 'demo-user',
    prenom: 'Ton foyer',
    nb_personnes: 1,
    nb_enfants: 0,
    enfants_ages: [],
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
      toast.erreur(t('profil.erreur_session'));
      return;
    }
    setSuppressionEnCours(true);
    const { error } = await supabase.functions.invoke('delete-account', {
      body: { userId: session.session.user.id },
    });
    setSuppressionEnCours(false);
    if (error) {
      toast.erreur(t('profil.erreur_suppression'));
      return;
    }
    resetUserStores();
    router.replace('/(auth)/connexion');
  };

  const seDeconnecter = async () => {
    await supabase.auth.signOut();
    resetUserStores();
    router.replace('/(auth)/connexion');
  };

  const apparenceOptions: { id: ApparencePreference; label: string }[] = [
    { id: 'auto', label: t('profil.apparence_auto') },
    { id: 'clair', label: t('profil.apparence_clair') },
    { id: 'sombre', label: t('profil.apparence_sombre') },
  ];

  return (
    <ScreenScroll contentContainerStyle={{ gap: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Heading style={{ color: '#FFFFFF' }}>{profilAffiche.prenom.charAt(0).toUpperCase()}</Heading>
        </View>
        <View style={{ flex: 1 }}>
          <DisplayLG numberOfLines={1}>{profilAffiche.prenom}</DisplayLG>
          {email && <Caption>{email}</Caption>}
        </View>
      </View>

      <Card style={{ padding: 20, gap: 14, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}>
            <UserRound size={22} color={colors.primary} />
          </View>
          <View>
            <Heading>{t('profil.infos_foyer')}</Heading>
            <Caption>{t('profil.infos_foyer_desc')}</Caption>
          </View>
        </View>
        <TextInput
          value={profilAffiche.prenom}
          onChangeText={(v) => mettreAJourPreferences({ prenom: v })}
          accessibilityLabel={t('profil.prenom_label')}
          style={{
            color: colors.textPrimary,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
        <BodySm>{t('profil.personnes_enfants', { nb_personnes: profilAffiche.nb_personnes, nb_enfants: profilAffiche.nb_enfants })}</BodySm>
      </Card>

      <RowRepliable
        Icon={Crown}
        titre={t('profil.abonnement')}
        resume={PALIERS_ABONNEMENT.find((p) => p.id === profilAffiche.abonnement)?.nom}
        ouvert={abonnementOuvert}
        onToggle={() => setAbonnementOuvert((v) => !v)}
      >
        {PALIERS_ABONNEMENT.map((p) => (
          <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Body style={{ fontWeight: profilAffiche.abonnement === p.id ? '700' : '400' }}>{p.nom}</Body>
            <Caption>{p.prix}</Caption>
          </View>
        ))}
      </RowRepliable>

      <RowRepliable
        Icon={Palette}
        titre={t('profil.apparence')}
        resume={apparenceOptions.find((o) => o.id === preference)?.label}
        ouvert={apparenceOuvert}
        onToggle={() => setApparenceOuvert((v) => !v)}
      >
        <Caption>{t('profil.apparence_desc')}</Caption>
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
      </RowRepliable>

      <Card style={{ padding: 20, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={22} color={colors.primary} />
          </View>
          <Heading>{t('profil.notifications')}</Heading>
        </View>
        <LigneNotification label={t('profil.notif_planning')} valeur={profilAffiche.notifications_planning} onChange={(v) => mettreAJourPreferences({ notifications_planning: v })} />
        <LigneNotification label={t('profil.notif_budget')} valeur={profilAffiche.notifications_budget} onChange={(v) => mettreAJourPreferences({ notifications_budget: v })} />
        <LigneNotification label={t('profil.notif_promos')} valeur={profilAffiche.notifications_promos} onChange={(v) => mettreAJourPreferences({ notifications_promos: v })} />
        <LigneNotification label={t('profil.notif_bilan')} valeur={profilAffiche.notifications_bilan} onChange={(v) => mettreAJourPreferences({ notifications_bilan: v })} />
      </Card>

      <Card style={{ padding: 20, gap: 8, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}>
            <Home size={22} color={colors.primary} />
          </View>
          <View>
            <Heading>{t('profil.preferences_foyer')}</Heading>
            <Caption>{t('profil.enseignes_favorites', { count: profilAffiche.enseignes_favorites.length || 0 })}</Caption>
          </View>
        </View>
        <BodySm>{t('profil.preferences_message')}</BodySm>
      </Card>

      <Pressable
        onPress={() => router.push('/gouts')}
        accessibilityRole="button"
        accessibilityLabel={t('gouts.titre')}
      >
        <Card style={{ padding: 20, gap: 4, borderRadius: 28, borderTopLeftRadius: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Heading>{t('gouts.titre')}</Heading>
              <Caption>{t('gouts.sous_titre')}</Caption>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        </Card>
      </Pressable>

      <RegimeParPersonneTeaser />

      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          borderStyle: 'dashed',
          padding: 14,
          gap: 4,
          opacity: 0.6,
        }}
        accessibilityRole="text"
        accessibilityLabel={t('profil.adresses_livraison_a11y')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MapPin size={14} color={colors.textMuted} />
          <Body>{t('profil.adresses_livraison_titre')}</Body>
        </View>
        <BodySm>{t('profil.adresses_livraison_description')}</BodySm>
      </View>

      <Pressable
        onPress={() => void seDeconnecter()}
        accessibilityRole="button"
        accessibilityLabel={t('profil.deconnexion')}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 4 }}
      >
        <LogOut size={16} color={colors.textPrimary} />
        <BodySm style={{ color: colors.textPrimary }}>{t('profil.deconnexion')}</BodySm>
      </Pressable>

      {!confirmationSuppression ? (
        <Pressable onPress={() => setConfirmationSuppression(true)} accessibilityRole="button" accessibilityLabel={t('profil.supprimer_compte')}>
          <BodySm style={{ color: colors.error, textAlign: 'center' }}>{t('profil.supprimer_compte')}</BodySm>
        </Pressable>
      ) : (
        <Card style={{ padding: 18, gap: 12, borderColor: colors.error }}>
          <ShieldAlert size={22} color={colors.error} />
          <Body>{t('profil.suppression_confirmation')}</Body>
          <TextInput
            value={emailSaisi}
            onChangeText={setEmailSaisi}
            placeholder={t('profil.email_placeholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            accessibilityLabel={t('profil.email_confirmation_label')}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.textPrimary }}
          />
          <Button
            label={t('profil.confirmer_suppression')}
            variant="secondary"
            onPress={supprimerCompte}
            disabled={!emailSaisi}
            loading={suppressionEnCours}
          />
        </Card>
      )}
    </ScreenScroll>
  );
}
