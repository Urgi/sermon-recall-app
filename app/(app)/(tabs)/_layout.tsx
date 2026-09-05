import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRecallionTheme } from '../../../contexts/ThemeContext';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  focused,
  color,
  size,
  active,
  inactive,
}: {
  focused: boolean;
  color: string;
  size: number;
  active: IoniconName;
  inactive: IoniconName;
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
        backgroundColor: focused ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
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
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
          height: 52 + Math.max(insets.bottom, 8),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        sceneStyle: { backgroundColor: colors.bgPage },
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
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={size}
              active="person"
              inactive="person-outline"
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
            />
          ),
        }}
      />
    </Tabs>
  );
}
