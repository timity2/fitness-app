import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Logo } from '@/components/Logo';
import { Button, FadeIn, InfoBox, Screen, T } from '@/components/ui';
import { Wave } from '@/components/Wave';
import { isDemo } from '@/lib/supabase';
import { colors, space } from '@/theme';

const FEATURES: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'barbell-outline', text: 'Программы тренировок и таймер отдыха' },
  { icon: 'stats-chart-outline', text: 'Графики прогресса и личные рекорды' },
  { icon: 'nutrition-outline', text: 'Дневник питания и воды' },
];

export default function Welcome() {
  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={{ gap: space.md }}>
          <Button title="Создать аккаунт" onPress={() => router.push('/(auth)/sign-up')} />
          <Button title="У меня уже есть аккаунт" variant="secondary" onPress={() => router.push('/(auth)/sign-in')} />
        </View>
      }
    >
      <Wave style={{ position: 'absolute', right: -20, top: 40 }} width={300} height={150} />
      <FadeIn style={{ marginTop: 72 }}>
        <Logo size={56} />
      </FadeIn>
      <FadeIn delay={120} style={{ marginTop: 44 }}>
        <T v="h1" style={{ fontSize: 34, lineHeight: 40 }}>
          Тренируйся{'\n'}в своём ритме
        </T>
        <T v="body" color={colors.text2} style={{ marginTop: space.md, fontSize: 16, lineHeight: 23 }}>
          Pulse помогает планировать тренировки, следить за питанием и видеть реальный прогресс.
        </T>
      </FadeIn>
      <FadeIn delay={240} style={{ marginTop: 36, gap: space.lg }}>
        {FEATURES.map((f) => (
          <View key={f.text} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={f.icon} size={20} color={colors.pink} />
            </View>
            <T v="bodyM" style={{ flex: 1 }}>
              {f.text}
            </T>
          </View>
        ))}
      </FadeIn>
      {isDemo ? (
        <FadeIn delay={360} style={{ marginTop: 32 }}>
          <InfoBox>
            Демо-режим: сервер Supabase не подключён, аккаунт и данные хранятся только на этом устройстве.
          </InfoBox>
        </FadeIn>
      ) : null}
    </Screen>
  );
}
