import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useSettings } from '@/api/profile';
import { useSessions } from '@/api/workouts';
import { Card, EmptyState, ErrorState, Header, Loading, Screen, T } from '@/components/ui';
import { formatDate, formatDuration, plural, units } from '@/lib/format';
import { colors, space } from '@/theme';

export default function History() {
  const sessions = useSessions();
  const { data: settings } = useSettings();
  const u = units(settings?.unit_system ?? 'metric');

  return (
    <Screen header={<Header title="История тренировок" />}>
      {sessions.isPending ? (
        <Loading />
      ) : sessions.isError ? (
        <ErrorState onRetry={() => sessions.refetch()} />
      ) : sessions.data.length === 0 ? (
        <EmptyState icon="calendar-outline" title="История пуста" text="Завершённые тренировки появятся здесь." action="К тренировкам" onAction={() => router.replace('/(tabs)/workouts')} />
      ) : (
        sessions.data.map((s) => (
          <Card key={s.id} onPress={() => router.push({ pathname: '/history/[id]', params: { id: s.id } })} style={{ marginBottom: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <T v="caption">{formatDate(s.finished_at)}</T>
              <T v="bodyM" numberOfLines={1} style={{ fontSize: 16, marginTop: 2 }}>
                {s.program_name}
              </T>
              <T v="caption" style={{ marginTop: 4 }}>
                {formatDuration(s.duration_sec)} · {s.exercises_count} {plural(s.exercises_count, 'упражнение', 'упражнения', 'упражнений')} · {s.sets_count}{' '}
                {plural(s.sets_count, 'подход', 'подхода', 'подходов')}
                {s.total_volume_kg > 0 ? ` · ${u.weight(s.total_volume_kg)}` : ''}
              </T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        ))
      )}
    </Screen>
  );
}
