/** Feedback haptique centralise — a utiliser sur toutes les interactions importantes (voir brief UX). */
import * as Haptics from 'expo-haptics';

export function useHaptics() {
  return {
    /** Checkbox cochée, sélection onboarding, tap tab bar */
    selection: () => Haptics.selectionAsync(),
    /** Swipe J'aime, planning généré, commande validée */
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    /** Swipe Je passe, erreur de paiement */
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    /** Boutons CTA, ouverture modals */
    light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    /** Confirmation importante, fin de swipe */
    medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    /** Validation commande — le moment le plus important du parcours */
    heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  };
}
