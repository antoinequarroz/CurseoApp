/**
 * Gestion des permissions iOS/Android. MVP : uniquement les notifications
 * push, demandees apres l'onboarding — pas de camera/photos (scan frigo = Phase 4).
 */
import { useCallback, useState } from 'react';
import { demanderPermissionNotifications } from '@/lib/notifications';

export function usePermissions() {
  const [notificationsAccordees, setNotificationsAccordees] = useState(false);

  const demanderNotifications = useCallback(async () => {
    const accorde = await demanderPermissionNotifications();
    setNotificationsAccordees(accorde);
    return accorde;
  }, []);

  return { notificationsAccordees, demanderNotifications };
}
