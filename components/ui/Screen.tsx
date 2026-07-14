import React from 'react';
import { ScrollView, View, type ScrollViewProps, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme-context';
import { useResponsive } from '@/hooks/useResponsive';

const TAB_BAR_CLEARANCE = 118;

export function Screen({
  children,
  style,
  padded = true,
  bottomInset = true,
  ...props
}: ViewProps & { children: React.ReactNode; padded?: boolean; bottomInset?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { paddingHorizontal } = useResponsive();

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.bg,
          paddingTop: Math.max(insets.top, 16) + 8,
          paddingHorizontal: padded ? paddingHorizontal : 0,
          paddingBottom: bottomInset ? Math.max(insets.bottom, 12) : 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export function ScreenScroll({
  children,
  style,
  contentContainerStyle,
  padded = true,
  tabBar = true,
  ...props
}: ScrollViewProps & { children: React.ReactNode; padded?: boolean; tabBar?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { paddingHorizontal } = useResponsive();

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: colors.bg }, style]}
      contentContainerStyle={[
        {
          paddingTop: Math.max(insets.top, 16) + 8,
          paddingHorizontal: padded ? paddingHorizontal : 0,
          paddingBottom: tabBar ? TAB_BAR_CLEARANCE + insets.bottom : Math.max(insets.bottom, 20),
        },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
