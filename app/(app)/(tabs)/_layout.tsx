import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRecallionTheme } from '../../../contexts/ThemeContext';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  focused,
  color,
  size,
  active,
  inactive,
  accentSoft,
}: {
  focused: boolean;
  color: string;
  size: number;
  active: IoniconName;
  inactive: IoniconName;
  accentSoft: string;
}) {
  const iconSize = focused ? Math.round(size * 1.12) : size;
  return (
    <View
      style={{
        width: 44,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? accentSoft : 'transparent',
      }}
    >
      <Ionicons name={focused ? active : inactive} size={iconSize} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useRecallionTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        sceneStyle: { backgroundColor: colors.bgPage },
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 52 + Math.max(insets.bottom, 8),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Devotionals',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={size}
              active="book"
              inactive="book-outline"
              accentSoft={colors.accentSoft}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={size}
              active="settings"
              inactive="settings-outline"
              accentSoft={colors.accentSoft}
            />
          ),
        }}
      />
    </Tabs>
  );
}
