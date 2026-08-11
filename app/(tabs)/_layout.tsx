/**
 * Navigation principale CoursIA.
 *
 * Quatre destinations stables restent dans la barre native. Les vues de
 * synthese, comme Economies, sont accessibles depuis leur contexte plutot que
 * de diluer la boucle Accueil -> Planifier -> Courses.
 */
import React from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/lib/theme-context';
import { useCoursesStore } from '@/stores/coursesStore';

export default function TabsLayout() {
  const { colors } = useTheme();
  const nbItemsCourses = useCoursesStore((s) => s.items.filter((item) => !item.coche).length);
  const badgeCourses = nbItemsCourses > 99 ? '99+' : String(nbItemsCourses);

  return (
    <NativeTabs
      tintColor={colors.primary}
      iconColor={{ default: colors.textMuted, selected: colors.primary }}
      labelStyle={{
        default: { color: colors.textMuted },
        selected: { color: colors.primary, fontWeight: '600' },
      }}
      badgeBackgroundColor={colors.accentDark}
      labelVisibilityMode="labeled"
      minimizeBehavior="never"
      backBehavior="history"
    >
      <NativeTabs.Trigger name="index" accessibilityLabel="Accueil" testID="tab-accueil">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="planifier" accessibilityLabel="Planifier" testID="tab-planifier">
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>Planifier</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="courses" accessibilityLabel="Courses" testID="tab-courses">
        <NativeTabs.Trigger.Icon sf={{ default: 'cart', selected: 'cart.fill' }} md="shopping_cart" />
        <NativeTabs.Trigger.Label>Courses</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={nbItemsCourses === 0}>{badgeCourses}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profil" accessibilityLabel="Profil" testID="tab-profil">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
