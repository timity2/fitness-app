import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IoniconName; activeIcon: IoniconName }[] = [
  { name: 'index', title: 'Главная', icon: 'home-outline', activeIcon: 'home' },
  { name: 'workouts', title: 'Тренировки', icon: 'barbell-outline', activeIcon: 'barbell' },
  { name: 'progress', title: 'Прогресс', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
  { name: 'nutrition', title: 'Питание', icon: 'nutrition-outline', activeIcon: 'nutrition' },
  { name: 'profile', title: 'Профиль', icon: 'person-outline', activeIcon: 'person' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.pink,
        tabBarInactiveTintColor: colors.text2,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, marginTop: 2 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? t.activeIcon : t.icon} size={24} color={String(color)} />,
          }}
        />
      ))}
    </Tabs>
  );
}
