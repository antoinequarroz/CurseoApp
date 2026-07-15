/** Navigation par onglets — icone active colorée primary, badge rouge sur Courses si liste non vide. */
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: 'Quicksand_500Medium', fontSize: 11, marginTop: 2 },
        tabBarItemStyle: { paddingTop: 8 },
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: Math.max(insets.bottom, 10),
          height: 66,
          borderRadius: 26,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          backgroundColor: 'transparent',
          shadowColor: '#000',
          shadowOpacity: isDark ? 0 : 0.14,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
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
