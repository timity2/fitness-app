// Раздел «Прогресс»: показатели, графики, рекорды и переходы к измерениям, фото, истории, достижениям.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useGoal, useProfile, useSettings } from '@/api/profile';
import { useAchievements, useMeasurements, useUserAchievements } from '@/api/progress';
import { useAllSets, useRecords, useSessions } from '@/api/workouts';
import { BarChart, LineChart, type ChartPoint } from '@/components/Charts';
import { Card, Chip, Row, Screen, SectionTitle, T, type IconName } from '@/components/ui';
import { formatDuration, formatShortDate, parseISODate, startOfWeek, units } from '@/lib/format';
import { weekStats } from '@/lib/recommend';
import { bucketize, inPeriod, PERIODS, type Period } from '@/lib/stats';
import { colors, space } from '@/theme';

type ChartKind = 'weight' | 'workouts' | 'volume' | 'strength' | 'activity';
const CHARTS: { value: ChartKind; label: string }[] = [
  { value: 'weight', label: 'Вес' },
  { value: 'workouts', label: 'Тренировки' },
  { value: 'strength', label: 'Сила' },
  { value: 'volume', label: 'Объём' },
  { value: 'activity', label: 'Активность' },
];

export default function Progress() {
  const { data: profile } = useProfile();
  const { data: goal } = useGoal();
  const { data: settings } = useSettings();
  const { data: sessions = [] } = useSessions();
  const { data: sets = [] } = useAllSets();
  const { data: records = [] } = useRecords();
  const { data: measurements = [] } = useMeasurements();
  const { data: achievements = [] } = useAchievements();
  const { data: unlocked = [] } = useUserAchievements();
  const u = units(settings?.unit_system ?? 'metric');

  const [period, setPeriod] = useState<Period>('month');
  const [chart, setChart] = useState<ChartKind>('weight');
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  const periodSessions = useMemo(() => sessions.filter((s) => inPeriod(s.finished_at, period)), [sessions, period]);
  const weights = useMemo(
    () => measurements.filter((m) => m.weight_kg != null && inPeriod(parseISODate(m.measured_on), period)).reverse(),
    [measurements, period],
  );
  const weightDelta = weights.length >= 2 ? weights[weights.length - 1].weight_kg! - weights[0].weight_kg! : null;
  const totalSec = periodSessions.reduce((n, s) => n + s.duration_sec, 0);
  const week = weekStats(sessions, startOfWeek(), goal?.workouts_per_week ?? 0);

  // упражнения, по которым есть подходы с весом — для графика силы
  const strengthExercises = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sets) if (s.exercise_id && s.weight_kg > 0) map.set(s.exercise_id, s.exercise_name);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [sets]);
  const selectedExercise = exerciseId ?? strengthExercises[0]?.id ?? null;

  const data: ChartPoint[] = useMemo(() => {
    if (chart === 'weight') return weights.map((m) => ({ label: formatShortDate(m.measured_on), value: u.toWeight(m.weight_kg!) }));
    if (chart === 'workouts') return bucketize(periodSessions.map((s) => ({ date: new Date(s.finished_at), value: 1 })), period);
    if (chart === 'volume') return bucketize(periodSessions.map((s) => ({ date: new Date(s.finished_at), value: u.toWeight(s.total_volume_kg) })), period);
    if (chart === 'activity') return bucketize(sessions.map((s) => ({ date: new Date(s.finished_at), value: Math.round(s.duration_sec / 60) })), 'week');
    // сила: максимальный рабочий вес за тренировочный день
    const byDay = new Map<string, number>();
    for (const s of sets) {
      if (s.exercise_id !== selectedExercise || s.weight_kg <= 0 || !inPeriod(s.completed_at, period)) continue;
      const day = s.completed_at.slice(0, 10);
      byDay.set(day, Math.max(byDay.get(day) ?? 0, s.weight_kg));
    }
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, kg]) => ({ label: formatShortDate(day), value: u.toWeight(kg) }));
  }, [chart, weights, periodSessions, sessions, sets, selectedExercise, period, u]);

  const chartHint: Record<ChartKind, string> = {
    weight: `Вес, ${u.weightUnit}`,
    workouts: 'Количество тренировок',
    volume: `Тренировочный объём, ${u.weightUnit}`,
    strength: `Максимальный рабочий вес, ${u.weightUnit}`,
    activity: 'Минуты тренировок за последние 7 дней',
  };

  return (
    <Screen>
      <T v="h1" style={{ marginTop: space.sm }}>
        Прогресс
      </T>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl, marginTop: space.lg }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.sm }}>
        {PERIODS.map((p) => (
          <Chip key={p.value} label={p.label} active={period === p.value} onPress={() => setPeriod(p.value)} />
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginTop: space.md }}>
        <Metric icon="scale-outline" value={u.weight(profile?.weight_kg)} label="текущий вес" />
        <Metric
          icon={weightDelta != null && weightDelta < 0 ? 'trending-down' : 'trending-up'}
          value={weightDelta == null ? '—' : `${weightDelta > 0 ? '+' : weightDelta < 0 ? '−' : ''}${u.weight(Math.abs(weightDelta))}`}
          label="изменение веса"
        />
        <Metric icon="barbell-outline" value={String(periodSessions.length)} label="тренировок" />
        <Metric icon="time-outline" value={totalSec > 0 ? formatDuration(totalSec) : '0 мин'} label="общее время" />
        <Metric icon="medal-outline" value={String(records.length)} label="личных рекордов" />
        <Metric icon="flag-outline" value={week.planned > 0 ? `${week.percent}%` : '—'} label="цель недели" />
      </View>

      <SectionTitle title="Графики" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.sm }}>
        {CHARTS.map((c) => (
          <Chip key={c.value} label={c.label} active={chart === c.value} onPress={() => setChart(c.value)} />
        ))}
      </ScrollView>
      <Card style={{ marginTop: space.md, paddingHorizontal: space.md }}>
        <T v="caption" style={{ marginBottom: space.sm, marginLeft: 4 }}>
          {chartHint[chart]}
        </T>
        {chart === 'strength' && strengthExercises.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingBottom: space.md }}>
            {strengthExercises.map((e) => (
              <Chip key={e.id} label={e.name} active={selectedExercise === e.id} onPress={() => setExerciseId(e.id)} />
            ))}
          </ScrollView>
        ) : null}
        {chart === 'weight' || chart === 'strength' ? (
          <LineChart
            data={data}
            emptyText={chart === 'weight' ? 'Запишите вес в разделе «Измерения тела», чтобы увидеть график' : 'Выполняйте подходы с весом — здесь появится динамика силы'}
          />
        ) : (
          <BarChart data={data} emptyText="За выбранный период тренировок не было" />
        )}
      </Card>

      <SectionTitle title="Личные рекорды" />
      <Card>
        {records.length === 0 ? (
          <T v="caption">Рекорды появятся после тренировок с рабочим весом.</T>
        ) : (
          records.slice(0, 5).map((r, i) => (
            <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 9, borderBottomWidth: i < Math.min(records.length, 5) - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <Ionicons name="medal" size={18} color={colors.pink} />
              <View style={{ flex: 1 }}>
                <T v="bodyM" numberOfLines={1}>
                  {r.exercise_name}
                </T>
                <T v="caption">{formatShortDate(r.achieved_at)}</T>
              </View>
              <T v="bodyM" color={colors.pinkLight}>
                {u.weight(r.weight_kg)} × {r.reps}
              </T>
            </View>
          ))
        )}
      </Card>

      <SectionTitle title="Подробнее" />
      <Card style={{ paddingVertical: 4 }}>
        <Row icon="body-outline" title="Измерения тела" value={measurements.length ? `${measurements.length} зап.` : undefined} onPress={() => router.push('/measurements')} />
        <Row icon="images-outline" title="Фотографии прогресса" onPress={() => router.push('/photos')} />
        <Row icon="calendar-outline" title="История тренировок" value={sessions.length ? String(sessions.length) : undefined} onPress={() => router.push('/history')} />
        <Row icon="trophy-outline" title="Достижения" value={`${unlocked.length} из ${achievements.length}`} onPress={() => router.push('/achievements')} last />
      </Card>
    </Screen>
  );
}

function Metric({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={{ width: '50%', padding: 6 }}>
      <Card style={{ padding: space.md }}>
        <Ionicons name={icon} size={20} color={colors.pink} />
        <T v="num" style={{ marginTop: 6, fontSize: 21 }} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </T>
        <T v="caption" style={{ fontSize: 12 }}>
          {label}
        </T>
      </Card>
    </View>
  );
}
