// Splash: логотип на тёмном фоне, пока проверяются сессия и анкета.
// Переход выполняет useAppBootstrap (см. корневой layout).
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';

import { useProfile } from '@/api/profile';
import { Logo } from '@/components/Logo';
import { Button, T } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme';

export default function Splash() {
  const a = useRef(new Animated.Value(0)).current;
  const session = useAuth((s) => s.session);
  const profile = useProfile();

  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [a]);

  const failed = !!session && profile.isError;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Animated.View style={{ opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }] }}>
        <Logo size={64} />
      </Animated.View>
      {failed ? (
        <View style={{ position: 'absolute', bottom: 64, left: 24, right: 24, alignItems: 'center' }}>
          <T v="caption" center style={{ marginBottom: 14 }}>
            Не удалось загрузить профиль. Проверьте подключение к интернету.
          </T>
          <Button title="Повторить" variant="secondary" small onPress={() => profile.refetch()} style={{ minWidth: 180 }} />
          <Button title="Выйти из аккаунта" variant="ghost" small onPress={() => supabase.auth.signOut()} />
        </View>
      ) : null}
    </View>
  );
}
