/** Templates et triggers des notifications push Coursia. */
import * as Notifications from 'expo-notifications';

export const NotificationTemplates = {
  planningRappel: {
    title: 'Ta semaine commence !',
    body: "Tu n'as pas encore planifié tes repas. 2 minutes suffisent.",
    trigger: { weekday: 2, hour: 8, minute: 0, repeats: true } as const,
  },
  budgetAlerte: (budgetRestant: number) => ({
    title: 'Budget courses',
    body: `Il te reste CHF ${budgetRestant.toFixed(2)} pour cette semaine.`,
    trigger: { seconds: 1 } as const,
  }),
  coursesRappel: {
    title: "Ta liste de courses t'attend",
    body: 'Tes ingrédients pour la semaine sont prêts.',
    trigger: { weekday: 4, hour: 12, minute: 0, repeats: true } as const,
  },
  promotionEnseigne: (enseigne: string, economie: number) => ({
    title: `Promo chez ${enseigne}`,
    body: `Économise jusqu'à CHF ${economie.toFixed(2)} sur ta liste actuelle.`,
    trigger: { seconds: 1 } as const,
  }),
  bilanHebdo: (economies: number) => ({
    title: 'Bilan de ta semaine',
    body: `Tu as économisé CHF ${economies.toFixed(2)} grâce à Coursia !`,
    trigger: { weekday: 6, hour: 18, minute: 0, repeats: true } as const,
  }),
};

/** A appeler apres l'onboarding (jamais au premier lancement). */
export async function demanderPermissionNotifications(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function planifierNotificationsRecurrentes(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: NotificationTemplates.planningRappel.title, body: NotificationTemplates.planningRappel.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, ...NotificationTemplates.planningRappel.trigger },
  });
  await Notifications.scheduleNotificationAsync({
    content: { title: NotificationTemplates.coursesRappel.title, body: NotificationTemplates.coursesRappel.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, ...NotificationTemplates.coursesRappel.trigger },
  });
}
