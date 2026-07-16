/** Navigation par onglets — pastille corail (accentDark) sur l'icone active, façon moodboard. */
import React from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Calendar, ShoppingCart, TrendingDown, User, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { useCoursesStore } from '@/stores/coursesStore';
import { Caption } from '@/components/ui/Typography';
import { ICON_SIZE } from '@/lib/icons';

function TabIcon({ Icon, label, focused }: { Icon: LucideIcon; label: string; focused: boolean }) {
  const { colors } = useTheme();

  if (!focused) {
    return <Icon size={ICON_SIZE.lg} color={colors.textMuted} />;
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 9999,
        backgroundColor: colors.accentDark,
      }}
    >
      <Icon size={ICON_SIZE.lg} color="#FFFFFF" />
      <Caption style={{ color: '#FFFFFF', fontWeight: '600' }}>{label}</Caption>
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const nbItemsCourses = useCoursesStore((s) => s.items.filter((i) => !i.coche).length);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
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
        options={{ title: 'Accueil', tabBarIcon: ({ focused }) => <TabIcon Icon={Home} label="Accueil" focused={focused} /> }}
      />
      <Tabs.Screen
        name="planifier"
        options={{ title: 'Planifier', tabBarIcon: ({ focused }) => <TabIcon Icon={Calendar} label="Planifier" focused={focused} /> }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ focused }) => <TabIcon Icon={ShoppingCart} label="Courses" focused={focused} />,
          tabBarBadge: nbItemsCourses > 0 ? nbItemsCourses : undefined,
        }}
      />
      <Tabs.Screen
        name="economies"
        options={{ title: 'Économies', tabBarIcon: ({ focused }) => <TabIcon Icon={TrendingDown} label="Économies" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon Icon={User} label="Profil" focused={focused} /> }}
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
