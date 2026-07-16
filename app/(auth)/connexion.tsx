/**
 * Ecran de connexion. Sign in with Apple apparait en premier (regle Apple :
 * obligatoire des qu'une connexion sociale tierce est proposee), suivi de
 * l'email/mot de passe comme alternative universelle.
 */
import React, { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { ChefHat } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { Button } from '@/components/ui/Button';
import { DisplayLG, BodySm } from '@/components/ui/Typography';
import { EmailSchema, MotDePasseSchema } from '@/lib/validation';
import { toast } from '@/lib/toast';
import { t } from '@/lib/i18n';

export default function Connexion() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [chargement, setChargement] = useState(false);

  const seConnecterApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Token Apple manquant');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
      router.replace('/(tabs)');
    } catch {
      toast.erreur(t('connexion.erreur_apple'));
    }
  };

  const seConnecterEmail = async () => {
    const emailValide = EmailSchema.safeParse(email);
    const motDePasseValide = MotDePasseSchema.safeParse(motDePasse);
    if (!emailValide.success || !motDePasseValide.success) {
      toast.erreur(t('connexion.erreur_validation'));
      return;
    }
    setChargement(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    setChargement(false);
    if (error) {
      toast.erreur(t('connexion.erreur_identifiants'));
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <KeyboardView>
      {/* Fond vert foret fixe (comme l'ecran de bienvenue du moodboard) — independant du theme clair/sombre. */}
      <View style={{ flex: 1, padding: 20, justifyContent: 'center', gap: 20, backgroundColor: '#0F2D27' }}>
        <View style={{ alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChefHat size={30} color="#FFFFFF" />
          </View>
          <DisplayLG style={{ color: '#FFFFFF', textAlign: 'center' }}>{t('onboarding.bienvenue_titre')}</DisplayLG>
          <BodySm style={{ color: 'rgba(255,255,255,0.72)', textAlign: 'center' }}>
            {t('onboarding.bienvenue_sous_titre')}
          </BodySm>
        </View>

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={28}
            style={{ height: 52 }}
            onPress={seConnecterApple}
          />
        )}

        <BodySm style={{ color: 'rgba(255,255,255,0.72)' }}>{t('connexion.ou_email')}</BodySm>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t('connexion.email_placeholder')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel={t('connexion.email_label')}
          style={{
            backgroundColor: colors.bgCard,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            padding: 14,
            color: colors.textPrimary,
          }}
        />
        <TextInput
          value={motDePasse}
          onChangeText={setMotDePasse}
          placeholder={t('connexion.mdp_placeholder')}
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          accessibilityLabel={t('connexion.mdp_label')}
          style={{
            backgroundColor: colors.bgCard,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            padding: 14,
            color: colors.textPrimary,
          }}
        />

        <Button label={t('connexion.se_connecter')} onPress={seConnecterEmail} loading={chargement} />
      </View>
    </KeyboardView>
  );
}
