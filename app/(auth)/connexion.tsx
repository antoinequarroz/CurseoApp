/**
 * Ecran de connexion. Sign in with Apple apparait en premier (regle Apple :
 * obligatoire des qu'une connexion sociale tierce est proposee), suivi de
 * l'email/mot de passe comme alternative universelle.
 */
import React, { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { Button } from '@/components/ui/Button';
import { DisplayLG, BodySm } from '@/components/ui/Typography';
import { EmailSchema, MotDePasseSchema } from '@/lib/validation';
import { toast } from '@/lib/toast';

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
      toast.erreur('Connexion Apple annulée ou impossible');
    }
  };

  const seConnecterEmail = async () => {
    const emailValide = EmailSchema.safeParse(email);
    const motDePasseValide = MotDePasseSchema.safeParse(motDePasse);
    if (!emailValide.success || !motDePasseValide.success) {
      toast.erreur('Vérifie ton email et ton mot de passe (8 caractères minimum)');
      return;
    }
    setChargement(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    setChargement(false);
    if (error) {
      toast.erreur('Email ou mot de passe incorrect');
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <KeyboardView>
      <View style={{ flex: 1, padding: 20, justifyContent: 'center', gap: 20, backgroundColor: colors.bg }}>
        <DisplayLG>Bienvenue sur Courseo</DisplayLG>

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={
              colors.bg === '#0F1412'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={28}
            style={{ height: 52 }}
            onPress={seConnecterApple}
          />
        )}

        <BodySm>Ou connecte-toi avec ton email</BodySm>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel="Adresse email"
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
          placeholder="Mot de passe"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          accessibilityLabel="Mot de passe"
          style={{
            backgroundColor: colors.bgCard,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            padding: 14,
            color: colors.textPrimary,
          }}
        />

        <Button label="Se connecter" onPress={seConnecterEmail} loading={chargement} />
      </View>
    </KeyboardView>
  );
}
