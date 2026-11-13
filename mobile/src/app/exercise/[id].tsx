import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Linking, View } from 'react-native';

import { useSettings } from '@/api/profile';
import { useExercise, useRecords } from '@/api/workouts';
import { Cover } from '@/components/Cover';
import { Tag } from '@/components/ProgramCard';
import { Button, Card, EmptyState, ErrorState, Header, Loading, Screen, SectionTitle, T } from '@/components/ui';
import { EQUIPMENT_LABELS, formatShortDate, LEVEL_SHORT, units } from '@/lib/format';
import { colors, space } from '@/theme';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = useExercise(id);
  const { data: records = [] } = useRecords();
  const { data: settings } = useSettings();
  const u = units(settings?.unit_system ?? 'metric');

  if (exercise.isPending) {
    return (
      <Screen header={<Header />}>
        <Loading />
      </Screen>
    );
  }
  if (exercise.isError) {
    return (
      <Screen header={<Header />}>
        <ErrorState onRetry={() => exercise.refetch()} />
      </Screen>
    );
  }
  const e = exercise.data;
  if (!e) {
    return (
      <Screen header={<Header />}>
        <EmptyState icon="help-circle-outline" title="Упражнение не найдено" />
      </Screen>
    );
  }
  const record = records.find((r) => r.exercise_id === e.id);

  return (
    <Screen header={<Header title="Упражнение" />}>
      <Cover imageUrl={e.image_url} categoryId={e.category_id} style={{ height: 200 }} iconSize={72} rounded={20} />
      {e.video_url ? (
        <Button title="Смотреть видео техники" variant="secondary" small icon="play-circle-outline" style={{ marginTop: space.md }} onPress={() => Linking.openURL(e.video_url!)} />
      ) : null}
      <T v="h1" style={{ marginTop: space.lg, fontSize: 26 }}>
        {e.name}
      </T>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: space.md, flexWrap: 'wrap' }}>
        <Tag label={LEVEL_SHORT[e.difficulty]} accent />
        <Tag label={EQUIPMENT_LABELS[e.equipment]} />
        {e.is_demo ? <Tag label="Демо-контент" /> : null}
      </View>
      {e.description ? (
        <T v="body" color={colors.text2} style={{ marginTop: space.md }}>
          {e.description}
        </T>
      ) : null}

      <Card style={{ flexDirection: 'row', marginTop: space.lg }}>
        <Cell value={String(e.default_sets)} label="подходы" />
        <Cell value={String(e.default_reps)} label="повторения" />
        <Cell value={`${e.default_rest_sec} с`} label="отдых" />
      </Card>

      {record ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md }}>
          <Ionicons name="medal" size={24} color={colors.pink} />
          <View style={{ flex: 1 }}>
            <T v="bodyM">
              Личный рекорд: {u.weight(record.weight_kg)} × {record.reps}
            </T>
            <T v="caption">{formatShortDate(record.achieved_at)}</T>
          </View>
        </Card>
      ) : null}

      <SectionTitle title="Работающие мышцы" />
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {e.primary_muscles.map((m) => (
          <Tag key={m} label={m} />
        ))}
      </View>

      <SectionTitle title="Техника выполнения" />
      <Card>
        <T v="body" style={{ lineHeight: 23 }}>
          {e.technique || 'Описание техники пока не добавлено.'}
        </T>
      </Card>

      {e.tips.length > 0 ? (
        <>
          <SectionTitle title="Советы" />
          <Card style={{ gap: space.md }}>
            {e.tips.map((t) => (
              <Bullet key={t} icon="checkmark-circle" color={colors.success} text={t} />
            ))}
          </Card>
        </>
      ) : null}

      {e.mistakes.length > 0 ? (
        <>
          <SectionTitle title="Распространённые ошибки" />
          <Card style={{ gap: space.md }}>
            {e.mistakes.map((t) => (
              <Bullet key={t} icon="close-circle" color={colors.error} text={t} />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <T v="num" style={{ fontSize: 20 }}>
        {value}
      </T>
      <T v="caption" style={{ fontSize: 12 }}>
        {label}
      </T>
    </View>
  );
}

function Bullet({ icon, color, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={19} color={color} style={{ marginTop: 1 }} />
      <T v="body" style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}
