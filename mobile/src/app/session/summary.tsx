// Итоги завершённой тренировки
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';

import { useSettings } from '@/api/profile';
import { useAchievements, useUserAchievements } from '@/api/progress';
import { useSessionDetails, useSessions } from '@/api/workouts';
import { Button, Card, ErrorState, FadeIn, Loading, Screen, SectionTitle, T } from '@/components/ui';
import { formatDuration, formatNumber, units } from '@/lib/format';
import { colors, gradient, space } from '@/theme';

export default function Summary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const details = useSessionDetails(id);
  const { data: sessions = [] } = useSessions();
  const { data: settings } = useSettings();
  const { data: achievements = [] } = useAchievements();
  const { data: unlocked = [] } = useUserAchievements();
  const u = units(settings?.unit_system ?? 'metric');
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: Platform.OS !== 'web', bounciness: 12, speed: 6 }).start();
  }, [a]);

  const footer = <Button title="Готово" onPress={() => router.replace('/(tabs)')} />;

  if (details.isPending) {
    return (
      <Screen edges={['top', 'bottom']} footer={footer}>
        <Loading label="Сохраняем результаты…" />
      </Screen>
    );
  }
  if (details.isError || !details.data) {
    return (
      <Screen edges={['top', 'bottom']} footer={footer}>
        <ErrorState message="Тренировка сохранена, но итоги не удалось загрузить." onRetry={() => details.refetch()} />
      </Screen>
    );
  }

  const { session, sets } = details.data;
  const prs = sets.filter((s) => s.is_pr);
  // лучший рекордный подход по каждому упражнению
  const prByExercise = [...new Map(prs.map((s) => [s.exercise_name, s])).values()];

  const previous = sessions.find(
    (s) => s.id !== session.id && s.program_id === session.program_id && new Date(s.finished_at) < new Date(session.finished_at),
  );
  const volumeDiff = previous && previous.total_volume_kg > 0 ? ((session.total_volume_kg - previous.total_volume_kg) / previous.total_volume_kg) * 100 : null;
  const durationDiff = previous ? session.duration_sec - previous.duration_sec : null;

  const finished = new Date(session.finished_at).getTime();
  const newAchievements = unlocked
    .filter((x) => Math.abs(new Date(x.unlocked_at).getTime() - finished) < 5 * 60_000)
    .map((x) => achievements.find((item) => item.id === x.achievement_id))
    .filter((x) => !!x);

  return (
    <Screen edges={['top', 'bottom']} footer={footer}>
      <View style={{ alignItems: 'center', marginTop: space.xxl }}>
        <Animated.View style={{ transform: [{ scale: a }] }}>
          <LinearGradient colors={gradient} style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="trophy" size={42} color={colors.text} />
          </LinearGradient>
        </Animated.View>
        <T v="h1" center style={{ marginTop: space.lg }}>
          Тренировка завершена
        </T>
        <T v="caption" center style={{ marginTop: 4, fontSize: 14 }}>
          {session.program_name}
        </T>
      </View>

      <FadeIn delay={150} style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginTop: space.xl }}>
        <Tile icon="time-outline" value={formatDuration(session.duration_sec)} label="продолжительность" />
        <Tile icon="list" value={String(session.exercises_count)} label="упражнений" />
        <Tile icon="repeat" value={String(session.sets_count)} label="подходов" />
        <Tile icon="barbell-outline" value={u.weight(session.total_volume_kg)} label="общий объём" />
      </FadeIn>

      <SectionTitle title="Личные рекорды" />
      {prByExercise.length > 0 ? (
        <Card style={{ gap: space.md }}>
          {prByExercise.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Ionicons name="medal" size={22} color={colors.pink} />
              <T v="bodyM" style={{ flex: 1 }} numberOfLines={1}>
                {s.exercise_name}
              </T>
              <T v="bodyM" color={colors.pinkLight}>
                {u.weight(s.weight_kg)} × {s.reps}
              </T>
            </View>
          ))}
        </Card>
      ) : (
        <Card>
          <T v="caption">В этой тренировке новых рекордов нет. Рекорд фиксируется, когда рабочий вес в упражнении превышает предыдущий максимум.</T>
        </Card>
      )}

      <SectionTitle title="Сравнение с прошлой тренировкой" />
      <Card>
        {previous ? (
          <View style={{ gap: space.md }}>
            <Compare
              label="Объём"
              text={volumeDiff == null ? 'нет данных для сравнения' : `${volumeDiff >= 0 ? '+' : '−'}${formatNumber(Math.abs(volumeDiff), 1)}%`}
              good={volumeDiff == null ? null : volumeDiff >= 0}
            />
            <Compare
              label="Время"
              text={durationDiff == null || Math.abs(durationDiff) < 30 ? 'примерно так же' : `${durationDiff > 0 ? 'дольше' : 'быстрее'} на ${formatDuration(Math.abs(durationDiff))}`}
              good={null}
            />
            <Compare label="Подходы" text={`${session.sets_count} против ${previous.sets_count}`} good={session.sets_count === previous.sets_count ? null : session.sets_count > previous.sets_count} />
          </View>
        ) : (
          <T v="caption">Это первая тренировка по этой программе — сравнение появится в следующий раз.</T>
        )}
      </Card>

      {newAchievements.length > 0 ? (
        <>
          <SectionTitle title="Новые достижения" />
          <Card style={{ gap: space.md }}>
            {newAchievements.map((item) => (
              <View key={item!.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Ionicons name="ribbon" size={22} color={colors.pink} />
                <View style={{ flex: 1 }}>
                  <T v="bodyM">{item!.title}</T>
                  <T v="caption">{item!.description}</T>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Tile({ icon, value, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string; label: string }) {
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

function Compare({ label, text, good }: { label: string; text: string; good: boolean | null }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <T v="caption" style={{ fontSize: 14 }}>
        {label}
      </T>
      <T v="bodyM" color={good == null ? colors.text : good ? colors.success : colors.error}>
        {text}
      </T>
    </View>
  );
}
