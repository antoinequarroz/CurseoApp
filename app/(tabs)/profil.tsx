/** Profil — infos foyer, abonnement, notifications, apparence, suppression de compte. */
import React, { useEffect, useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Clock3,
  CookingPot,
  Crown,
  HelpCircle,
  LogOut,
  MapPin,
  Palette,
  ShoppingBasket,
  Sparkles,
  ShieldAlert,
  UserRound,
  Users,
} from 'lucide-react-native';
import { useTheme, type ApparencePreference } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { supabase } from '@/lib/supabase';
import { resetUserStores } from '@/lib/resetSession';
import { PALIERS_ABONNEMENT, restaurerAchats } from '@/lib/revenuecat';
import { useAbonnement } from '@/hooks/useAbonnement';
import { PaywallModal } from '@/components/ui/PaywallModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Heading, Body, BodySm, Caption } from '@/components/ui/Typography';
import { toast } from '@/lib/toast';
import { t } from '@/lib/i18n';

function LigneNotification({
  label,
  valeur,
  onChange,
}: {
  label: string;
  valeur: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
      }}
    >
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
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: colors.bgSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Heading>{titre}</Heading>
          {resume && <Caption>{resume}</Caption>}
        </View>
        <ChevronRight
          size={20}
          color={colors.textMuted}
          style={{ transform: [{ rotate: ouvert ? '90deg' : '0deg' }] }}
        />
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
  const [paywallFamilleVisible, setPaywallFamilleVisible] = useState(false);
  const [restaurationEnCours, setRestaurationEnCours] = useState(false);
  const { estAuMoins } = useAbonnement();

  // COUR-33 : "Restaurer les achats fonctionne apres reinstallation" —
  // restaurerAchats() (lib/revenuecat.ts) existait depuis COUR-32 mais
  // n'etait branchee a aucune UI (code mort, comme initRevenueCat l'etait
  // avant COUR-32). Reflete immediatement le palier retrouve, sans attendre
  // le webhook (meme logique que l'achat, PaywallModal).
  const restaurerLesAchats = async () => {
    setRestaurationEnCours(true);
    try {
      const niveau = await restaurerAchats();
      useProfilStore.getState().refleterAbonnementLocal(niveau);
      toast.succes(t('profil.restauration_reussie'));
    } catch (error) {
      console.warn('[profil] Echec restauration achats', error);
      toast.erreur(t('profil.restauration_echec'));
    } finally {
      setRestaurationEnCours(false);
    }
  };

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
    equipements_cuisine: null,
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

      <Pressable
        onPress={() => router.push('/mon-foyer')}
        accessibilityRole="button"
        accessibilityLabel={t('mon_foyer.titre')}
      >
        <Card style={{ padding: 20, gap: 4, borderRadius: 28, borderTopLeftRadius: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.bgSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserRound size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Heading>{t('mon_foyer.titre')}</Heading>
              <Caption>
                {t('profil.personnes_enfants', {
                  nb_personnes: profilAffiche.nb_personnes,
                  nb_enfants: profilAffiche.nb_enfants,
                })}
              </Caption>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        </Card>
      </Pressable>

      <RowRepliable
        Icon={Crown}
        titre={t('profil.abonnement')}
        resume={PALIERS_ABONNEMENT.find((p) => p.id === profilAffiche.abonnement)?.nom}
        ouvert={abonnementOuvert}
        onToggle={() => setAbonnementOuvert((v) => !v)}
      >
        {PALIERS_ABONNEMENT.map((p) => (
          <View
            key={p.id}
            style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}
          >
            <Body style={{ fontWeight: profilAffiche.abonnement === p.id ? '700' : '400' }}>{p.nom}</Body>
            <Caption>{p.prix}</Caption>
          </View>
        ))}
        <Button
          label={t('profil.restaurer_achats')}
          variant="secondary"
          loading={restaurationEnCours}
          onPress={() => void restaurerLesAchats()}
        />
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
              <BodySm style={{ color: preference === o.id ? '#FFFFFF' : colors.textPrimary }}>
                {o.label}
              </BodySm>
            </Pressable>
          ))}
        </View>
      </RowRepliable>

      <Card style={{ padding: 20, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: colors.bgSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={22} color={colors.primary} />
          </View>
          <Heading>{t('profil.notifications')}</Heading>
        </View>
        <LigneNotification
          label={t('profil.notif_planning')}
          valeur={profilAffiche.notifications_planning}
          onChange={(v) => mettreAJourPreferences({ notifications_planning: v })}
        />
        <LigneNotification
          label={t('profil.notif_budget')}
          valeur={profilAffiche.notifications_budget}
          onChange={(v) => mettreAJourPreferences({ notifications_budget: v })}
        />
        <LigneNotification
          label={t('profil.notif_promos')}
          valeur={profilAffiche.notifications_promos}
          onChange={(v) => mettreAJourPreferences({ notifications_promos: v })}
        />
        <LigneNotification
          label={t('profil.notif_bilan')}
          valeur={profilAffiche.notifications_bilan}
          onChange={(v) => mettreAJourPreferences({ notifications_bilan: v })}
        />
      </Card>

      <Pressable
        onPress={() => router.push('/equipements-cuisine')}
        accessibilityRole="button"
        accessibilityLabel={t('equipements.titre')}
      >
        <Card style={{ padding: 20, gap: 4, borderRadius: 28, borderTopLeftRadius: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.bgSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CookingPot size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Heading>{t('equipements.titre')}</Heading>
              <Caption>
                {profilAffiche.equipements_cuisine == null
                  ? t('equipements.non_renseigne')
                  : t('equipements.resume', { count: profilAffiche.equipements_cuisine.length })}
              </Caption>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        </Card>
      </Pressable>

      <Pressable
        onPress={() => router.push('/gouts')}
        accessibilityRole="button"
        accessibilityLabel={t('gouts.titre')}
      >
        <Card style={{ padding: 20, gap: 4, borderRadius: 28, borderTopLeftRadius: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.bgSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
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

      <Pressable
        onPress={() =>
          estAuMoins('famille') ? router.push('/membres-foyer') : setPaywallFamilleVisible(true)
        }
        accessibilityRole="button"
        accessibilityLabel={t('famille.titre')}
      >
        <Card style={{ padding: 20, gap: 4, borderRadius: 28, borderTopLeftRadius: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.bgSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Heading>{t('famille.titre')}</Heading>
              <Caption>{t('famille.sous_titre')}</Caption>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        </Card>
      </Pressable>
      <PaywallModal
        visible={paywallFamilleVisible}
        onClose={() => setPaywallFamilleVisible(false)}
        onChoisir={() => setPaywallFamilleVisible(false)}
        featureOrigine="membres_foyer"
      />

      <Pressable
        onPress={() => router.push('/adresses')}
        accessibilityRole="button"
        accessibilityLabel={t('adresses.titre')}
      >
        <Card style={{ padding: 20, gap: 4, borderRadius: 28, borderTopLeftRadius: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.bgSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Heading>{t('adresses.titre')}</Heading>
              <Caption>{t('adresses.sous_titre')}</Caption>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        </Card>
      </Pressable>

      <Pressable
        onPress={() => router.push('/preferences-courses')}
        accessibilityRole="button"
        accessibilityLabel={t('preferences_courses.titre')}
      >
        <Card style={{ padding: 20, gap: 4, borderRadius: 28, borderTopLeftRadius: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.bgSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingBasket size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Heading>{t('preferences_courses.titre')}</Heading>
              <Caption>{t('preferences_courses.profil_resume')}</Caption>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        </Card>
      </Pressable>

      <Pressable
        onPress={() => router.push('/commandes-demo')}
        accessibilityRole="button"
        accessibilityLabel={t('historique_demo.titre')}
      >
        <Card style={{ padding: 20, gap: 4, borderRadius: 28, borderTopLeftRadius: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.bgSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock3 size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Heading>{t('historique_demo.titre')}</Heading>
              <Caption>{t('historique_demo.profil_resume')}</Caption>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        </Card>
      </Pressable>

      <Pressable
        onPress={() => router.push('/aide')}
        accessibilityRole="button"
        accessibilityLabel={t('aide.titre')}
      >
        <Card style={{ padding: 20, gap: 4, borderRadius: 28, borderTopLeftRadius: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.bgSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HelpCircle size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Heading>{t('aide.titre')}</Heading>
              <Caption>{t('aide.sous_titre')}</Caption>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        </Card>
      </Pressable>

      <Pressable
        onPress={() => void seDeconnecter()}
        accessibilityRole="button"
        accessibilityLabel={t('profil.deconnexion')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 4,
        }}
      >
        <LogOut size={16} color={colors.textPrimary} />
        <BodySm style={{ color: colors.textPrimary }}>{t('profil.deconnexion')}</BodySm>
      </Pressable>

      {!confirmationSuppression ? (
        <Pressable
          onPress={() => setConfirmationSuppression(true)}
          accessibilityRole="button"
          accessibilityLabel={t('profil.supprimer_compte')}
        >
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
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              padding: 12,
              color: colors.textPrimary,
            }}
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
