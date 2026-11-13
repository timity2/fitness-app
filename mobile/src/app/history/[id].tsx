import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useSettings } from '@/api/profile';
import { useDeleteSession, useSessionDetails } from '@/api/workouts';
import { Card, confirm, EmptyState, ErrorState, Header, IconButton, Loading, Screen, T } from '@/components/ui';
import { formatDate, formatDuration, units } from '@/lib/format';
import { colors, space } from '@/theme';
import type { WorkoutSet } from '@/types/db';

export default function HistoryDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const details = useSessionDetails(id);
  const remove = useDeleteSession();
  const { data: settings } = useSettings();
  const u = units(settings?.unit_system ?? 'metric');

  if (details.isPending) {
    return (
      <Screen header={<Header />}>
        <Loading />
      </Screen>
    );
  }
  if (details.isError) {
    return (
      <Screen header={<Header />}>
        <ErrorState onRetry={() => details.refetch()} />
      </Screen>
    );
  }
  if (!details.data) {
    return (
      <Screen header={<Header />}>
        <EmptyState icon="help-circle-outline" title="Тренировка не найдена" />
      </Screen>
    );
  }

  const { session, sets } = details.data;
  const groups = new Map<number, WorkoutSet[]>();
  for (const s of sets) groups.set(s.exercise_position, [...(groups.get(s.exercise_position) ?? []), s]);

  const onDelete = () =>
    confirm('Удалить тренировку?', 'Запись и все её подходы будут удалены из истории. Это действие нельзя отменить.', () => remove.mutate(session.id, { onSuccess: () => router.back() }), 'Удалить', true);

  return (
    <Screen header={<Header title="Тренировка" right={<IconButton icon="trash-outline" label="Удалить тренировку" color={colors.error} onPress={onDelete} />} />}>
      <T v="caption">{formatDate(session.finished_at)}</T>
      <T v="h1" style={{ fontSize: 26, marginTop: 2 }}>
        {session.program_name}
      </T>

      <Card style={{ flexDirection: 'row', marginTop: space.lg }}>
        <Cell value={formatDuration(session.duration_sec)} label="время" />
        <Cell value={String(session.sets_count)} label="подходов" />
        <Cell value={u.weight(session.total_volume_kg)} label="объём" />
      </Card>

      {[...groups.entries()].map(([position, list]) => (
        <Card key={position} style={{ marginTop: space.md }}>
          <T v="h3" numberOfLines={1}>
            {list[0].exercise_name}
          </T>
          <View style={{ marginTop: space.md, gap: 8 }}>
            {list.map((s) => (
              <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <T v="caption" style={{ width: 84 }}>
                  Подход {s.set_number}
                </T>
                <T v="bodyM" style={{ flex: 1 }}>
                  {s.weight_kg > 0 ? `${u.weight(s.weight_kg)} × ${s.reps}` : `${s.reps} повт.`}
                </T>
                {s.is_pr ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="medal" size={15} color={colors.pink} />
                    <T v="small" color={colors.pinkLight}>
                      рекорд
                    </T>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <T v="num" style={{ fontSize: 18 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </T>
      <T v="caption" style={{ fontSize: 12 }}>
        {label}
      </T>
    </View>
  );
}
