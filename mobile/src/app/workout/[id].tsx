// Детальная страница тренировки — она же экран «перед началом».
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useProgramDetails, useSetActiveProgram, useToggleUserProgram, useUserPrograms } from '@/api/workouts';
import { Cover } from '@/components/Cover';
import { Tag } from '@/components/ProgramCard';
import { Button, Card, confirm, EmptyState, ErrorState, Header, IconButton, InfoBox, Loading, Screen, SectionTitle, T } from '@/components/ui';
import { EQUIPMENT_LABELS, GOAL_LABELS, LEVEL_SHORT, LOCATION_LABELS, TYPE_LABELS } from '@/lib/format';
import { useUid } from '@/store/auth';
import { useWorkout, type PlanExercise } from '@/store/workout';
import { colors, space } from '@/theme';

export default function WorkoutDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useUid();
  const details = useProgramDetails(id);
  const { data: userPrograms = [] } = useUserPrograms();
  const toggle = useToggleUserProgram();
  const setActive = useSetActiveProgram();
  const active = useWorkout((s) => s.active);
  const start = useWorkout((s) => s.start);

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
        <EmptyState icon="help-circle-outline" title="Тренировка не найдена" text="Возможно, она была удалена из каталога." />
      </Screen>
    );
  }

  const { program, items } = details.data;
  const mine = userPrograms.find((u) => u.program_id === program.id);
  const totalSets = items.reduce((n, i) => n + i.sets, 0);

  const begin = () => {
    if (!uid || items.length === 0) return;
    const plan: PlanExercise[] = items.map((i, index) => ({
      exerciseId: i.exercise_id,
      categoryId: i.exercise.category_id,
      name: i.exercise.name,
      position: index,
      sets: i.sets,
      reps: i.reps,
      restSec: i.rest_sec,
    }));
    start(uid, program.id, program.name, plan);
    router.push('/session');
  };

  const onStart = () => {
    if (active && active.programId === program.id) {
      router.push('/session');
    } else if (active) {
      confirm('Начать новую тренировку?', `У вас есть незавершённая тренировка «${active.programName}». Её прогресс будет потерян.`, begin, 'Начать новую', true);
    } else begin();
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <Header
          title="Тренировка"
          right={
            <IconButton
              icon={mine ? 'bookmark' : 'bookmark-outline'}
              color={mine ? colors.pink : colors.text}
              label={mine ? 'Убрать из моих' : 'Добавить в мои'}
              onPress={() => toggle.mutate({ programId: program.id, add: !mine })}
            />
          }
        />
      }
      footer={
        <Button
          title={active?.programId === program.id ? 'Продолжить тренировку' : 'Начать тренировку'}
          icon="play"
          onPress={onStart}
          disabled={items.length === 0}
        />
      }
    >
      <Cover imageUrl={program.image_url} categoryId={program.category_id} style={{ height: 180 }} iconSize={64} rounded={20} />
      <T v="h1" style={{ marginTop: space.lg, fontSize: 26 }}>
        {program.name}
      </T>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: space.md, flexWrap: 'wrap' }}>
        <Tag label={LEVEL_SHORT[program.difficulty]} accent />
        <Tag label={LOCATION_LABELS[program.location]} />
        <Tag label={TYPE_LABELS[program.workout_type]} />
        {program.goal_type ? <Tag label={GOAL_LABELS[program.goal_type]} /> : null}
        {program.is_demo ? <Tag label="Демо-контент" /> : null}
      </View>
      {program.description ? (
        <T v="body" color={colors.text2} style={{ marginTop: space.md }}>
          {program.description}
        </T>
      ) : null}

      <Card style={{ flexDirection: 'row', marginTop: space.lg }}>
        <Metric icon="list" value={String(items.length)} label="упражнений" />
        <Metric icon="repeat" value={String(totalSets)} label="подходов" />
        <Metric icon="time-outline" value={`~${program.duration_min}`} label="минут" />
      </Card>

      {program.target_muscles.length > 0 ? (
        <>
          <T v="caption" style={{ marginTop: space.lg, marginBottom: 8 }}>
            Целевые мышцы
          </T>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {program.target_muscles.map((m) => (
              <Tag key={m} label={m} />
            ))}
          </View>
        </>
      ) : null}

      <View style={{ marginTop: space.lg }}>
        {mine?.is_active ? (
          <InfoBox icon="checkmark-circle-outline">Это ваша активная программа — она показывается на главной.</InfoBox>
        ) : (
          <Button title="Сделать активной программой" variant="secondary" small icon="flag-outline" loading={setActive.isPending} onPress={() => setActive.mutate(program.id)} />
        )}
      </View>

      <SectionTitle title="Упражнения" />
      {items.length === 0 ? (
        <Card>
          <T v="caption">В этой программе пока нет упражнений.</T>
        </Card>
      ) : (
        items.map((item, index) => (
          <Card key={item.id} onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: item.exercise_id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, marginBottom: space.md }}>
            <Cover imageUrl={item.exercise.image_url} categoryId={item.exercise.category_id} style={{ width: 60, height: 60 }} iconSize={26} rounded={12} />
            <View style={{ flex: 1 }}>
              <T v="bodyM" numberOfLines={1}>
                {index + 1}. {item.exercise.name}
              </T>
              <T v="caption" numberOfLines={1}>
                {item.sets} × {item.reps} · отдых {item.rest_sec} с · {EQUIPMENT_LABELS[item.exercise.equipment].toLowerCase()}
              </T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        ))
      )}
    </Screen>
  );
}

function Metric({ icon, value, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Ionicons name={icon} size={18} color={colors.pink} />
      <T v="num" style={{ fontSize: 20 }}>
        {value}
      </T>
      <T v="caption" style={{ fontSize: 12 }}>
        {label}
      </T>
    </View>
  );
}
