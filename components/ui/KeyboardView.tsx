/** Wrapper clavier obligatoire : onboarding, profil, assistant IA, recherche recettes. */
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

export function KeyboardView({ children, scrollable = true }: { children: React.ReactNode; scrollable?: boolean }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {scrollable ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </KeyboardAvoidingView>
  );
}
