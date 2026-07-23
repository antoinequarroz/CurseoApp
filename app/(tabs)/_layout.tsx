/**
 * Navigation par onglets — barre standard iOS (pleine largeur, ancree au bord,
 * labels toujours visibles, icone+texte teintes en corail quand actif). Suite
 * a la recommandation HIG/iOS 26 : eviter une tab bar flottante personnalisee
 * avec effets de verre empiles, preferer la composition systeme simple.
 */
import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Calendar, ShoppingCart, TrendingDown, User } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { useCoursesStore } from '@/stores/coursesStore';
import { ICON_SIZE } from '@/lib/icons';

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const nbItemsCourses = useCoursesStore((s) => s.items.filter((i) => !i.coche).length);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={{ flex: 1 }} />
        ),
        tabBarButton: (props) => (
          <TabButton {...props} onPressCustom={() => void haptics.selection()} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Accueil', tabBarIcon: ({ color }) => <Home size={ICON_SIZE.lg} color={color} /> }}
      />
      <Tabs.Screen
        name="planifier"
        options={{ title: 'Planifier', tabBarIcon: ({ color }) => <Calendar size={ICON_SIZE.lg} color={color} /> }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color }) => <ShoppingCart size={ICON_SIZE.lg} color={color} />,
          tabBarBadge: nbItemsCourses > 0 ? nbItemsCourses : undefined,
        }}
      />
      <Tabs.Screen
        name="economies"
        options={{ title: 'Économies', tabBarIcon: ({ color }) => <TrendingDown size={ICON_SIZE.lg} color={color} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: 'Profil', tabBarIcon: ({ color }) => <User size={ICON_SIZE.lg} color={color} /> }}
      />
    </Tabs>
  );
}

interface TabButtonProps extends PressableProps {
  onPressCustom: () => void;
}

function TabButton({ onPressCustom, onPress, ...props }: TabButtonProps) {
  return (
    <Pressable
      {...props}
      onPress={(e) => {
        onPressCustom();
        onPress?.(e);
      }}
    />
  );
}
