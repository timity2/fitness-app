// «Программа»: активная программа, недельный план и список своих тренировок
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useGoal } from '@/api/profile';
import { usePrograms, useProgramExerciseCounts, useSessions, useUserPrograms } from '@/api/workouts';
import { ProgramCard } from '@/components/ProgramCard';
import { Button, Card, EmptyState, Header, ProgressBar, Screen, SectionTitle, T } from '@/components/ui';
import { addDays, formatShortDate, startOfWeek, toISODate, WEEKDAYS_SHORT } from '@/lib/format';
import { weekStats } from '@/lib/recommend';
import { colors, gradient, space } from '@/theme';

export default function ProgramScreen() {
  const { data: goal } = useGoal();
  const { data: programs = [] } = usePrograms();
  const { data: counts = {} } = useProgramExerciseCounts();
  const { data: userPrograms = [] } = useUserPrograms();
  const { data: sessions = [] } = useSessions();

  const weekStart = startOfWeek();
  const planned = goal?.workouts_per_week ?? 0;
  const week = weekStats(sessions, weekStart, planned);
  const today = toISODate();
  const preferred = goal?.preferred_days ?? [];

  const activeId = userPrograms.find((u) => u.is_active)?.program_id;
  const activeProgram = programs.find((p) => p.id === activeId);
  const mine = programs.filter((p) => p.id !== activeId && (p.owner_id || userPrograms.some((u) => u.program_id === p.id)));

  return (
    <Screen header={<Header title="Программа" />}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T v="h3">Эта неделя</T>
          <T v="caption">
            {week.done} из {planned || '—'} · {week.minutes} мин
          </T>
        </View>
        <View style={{ marginTop: space.md }}>
          <ProgressBar value={planned ? week.done / planned : 0} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.lg }}>
          {WEEKDAYS_SHORT.map((d, i) => {
            const date = addDays(weekStart, i);
            const iso = toISODate(date);
            const done = week.doneDays.has(i + 1);
            const isPlanned = preferred.includes(i + 1);
            const isToday = iso === today;
            return (
              <View key={d} style={{ alignItems: 'center', gap: 6 }}>
                <T v="small" color={isToday ? colors.pink : colors.muted}>
                  {d}
                </T>
                {done ? (
                  <LinearGradient colors={gradient} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark" size={18} color={colors.text} />
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isPlanned ? 'transparent' : colors.card2,
                      borderWidth: isPlanned ? 1.5 : 0,
                      borderColor: isToday ? colors.pink : colors.muted,
                    }}
                  >
                    <T v="small" color={isPlanned ? colors.text : colors.muted}>
                      {date.getDate()}
                    </T>
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <T v="caption" style={{ marginTop: space.lg }}>
          {preferred.length > 0
            ? 'Обведены предпочитаемые дни тренировок из анкеты.'
            : 'Предпочитаемые дни не выбраны — их можно указать в анкете.'}
        </T>
        <Button title="Изменить график" variant="secondary" small style={{ marginTop: space.md }} onPress={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })} />
      </Card>

      <SectionTitle title="Активная программа" />
      {activeProgram ? (
        <ProgramCard program={activeProgram} exercises={counts[activeProgram.id]?.exercises} note={`Выполнена ${sessions.filter((s) => s.program_id === activeProgram.id).length} раз`} />
      ) : (
        <Card>
          <EmptyState icon="flag-outline" title="Программа не выбрана" text="Выберите тренировку в каталоге и сделайте её активной — она появится на главной." action="Выбрать программу" onAction={() => router.push('/(tabs)/workouts')} />
        </Card>
      )}

      <SectionTitle title="Мои тренировки" action="Каталог" onAction={() => router.push('/(tabs)/workouts')} />
      {mine.length > 0 ? (
        mine.map((p) => <ProgramCard key={p.id} program={p} exercises={counts[p.id]?.exercises} />)
      ) : (
        <Card>
          <T v="caption">Добавляйте тренировки в «Мои» значком закладки на странице программы.</T>
        </Card>
      )}

      {sessions[0] ? (
        <>
          <SectionTitle title="Последняя активность" action="История" onAction={() => router.push('/history')} />
          <Card onPress={() => router.push({ pathname: '/history/[id]', params: { id: sessions[0].id } })}>
            <T v="bodyM">{sessions[0].program_name}</T>
            <T v="caption">{formatShortDate(sessions[0].finished_at)}</T>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
