import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_700Bold_Italic,
  useFonts,
} from '@expo-google-fonts/inter';
import { useNetInfo } from '@react-native-community/netinfo';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '@/components/ui';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { queryClient, queryPersister } from '@/lib/query';
import { isDemo } from '@/lib/supabase';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function OfflineBanner() {
  const net = useNetInfo();
  const insets = useSafeAreaInsets();
  if (isDemo || net.isConnected !== false) return null;
  return (
    <View style={{ backgroundColor: colors.card2, paddingTop: insets.top + 6, paddingBottom: 6, paddingHorizontal: 16 }}>
      <T v="caption" center>
        Нет подключения к интернету — показаны сохранённые данные
      </T>
    </View>
  );
}

function Root() {
  useAppBootstrap();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="session/index" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="session/summary" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_700Bold_Italic,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: 1000 * 60 * 60 * 24,
          // подписанные ссылки на приватные файлы не сохраняются на диск
          dehydrateOptions: {
            shouldDehydrateQuery: (q) => q.state.status === 'success' && !['photos', 'avatar-url'].includes(String(q.queryKey[0])),
          },
        }}
      >
        <StatusBar style="light" />
        <Root />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
