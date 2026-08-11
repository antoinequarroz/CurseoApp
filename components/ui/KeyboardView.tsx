/** Wrapper clavier obligatoire : onboarding, profil, assistant IA, recherche recettes. */
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, type ColorValue } from 'react-native';

interface KeyboardViewProps {
  children: React.ReactNode;
  scrollable?: boolean;
  backgroundColor?: ColorValue;
  keyboardVerticalOffset?: number;
}

export function KeyboardView({
  children,
  scrollable = true,
  backgroundColor,
  keyboardVerticalOffset = 0,
}: KeyboardViewProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor }}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {scrollable ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor }}
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
