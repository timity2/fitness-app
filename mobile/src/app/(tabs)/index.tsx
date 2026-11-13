// Главная. Верхняя часть повторяет композицию референса: логотип, приветствие с волной,
// недельная карточка с кольцом, розовый баннер программы, четыре плитки, «Мой прогресс».
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useQueryClient } from '@tanstack/react-query';

import { useNotifications } from '@/api/notifications';
import { useNutritionEntries } from '@/api/nutrition';
import { useGoal, useProfile, useSettings } from '@/api/profile';
import { useAchievements, useMeasurements, useUserAchievements } from '@/api/progress';
import { usePrograms, useProgramExerciseCounts, useSessions, useUserPrograms } from '@/api/workouts';
import { Avatar } from '@/components/Avatar';
import { Cover } from '@/components/Cover';
import { Logo } from '@/components/Logo';
import { ProgramCard } from '@/components/ProgramCard';
import { Card, FadeIn, ProgressBar, Ring, Screen, SectionTitle, T, Tap, type IconName } from '@/components/ui';
import { Wave } from '@/components/Wave';
import { useTodaySteps } from '@/hooks/useTodaySteps';
import { sumMacros, weightProgress } from '@/lib/calc';
import { formatDuration, formatNumber, formatShortDate, GOAL_LABELS, greeting, plural, startOfWeek, toISODate, units, WEEKDAYS_SHORT } from '@/lib/format';
import { recommendPrograms, weekStats } from '@/lib/recommend';
import { useWorkout } from '@/store/workout';
import { colors, gradient, radius, space } from '@/theme';

const TILES: { title: string; icon: IconName; href: '/(tabs)/workouts' | '/program' | '/(tabs)/progress' | '/(tabs)/nutrition' }[] = [
  { title: 'Тренировки', icon: 'barbell', href: '/(tabs)/workouts' },
  { title: 'Программа', icon: 'calendar', href: '/program' },
  { title: 'Прогресс', icon: 'stats-chart', href: '/(tabs)/progress' },
  { title: 'Питание', icon: 'nutrition', href: '/(tabs)/nutrition' },
];

export default function Home() {
  const qc = useQueryClient();
  const today = toISODate();
  const { data: profile } = useProfile();
  const { data: goal } = useGoal();
  const { data: settings } = useSettings();
  const { data: sessions = [] } = useSessions();
  const { data: programs = [] } = usePrograms();
  const { data: counts = {} } = useProgramExerciseCounts();
  const { data: userPrograms = [] } = useUserPrograms();
  const { data: entries = [] } = useNutritionEntries(today);
  const { data: notifications = [] } = useNotifications();
  const { data: measurements = [] } = useMeasurements();
  const { data: achievements = [] } = useAchievements();
  const { data: unlocked = [] } = useUserAchievements();
  const active = useWorkout((s) => s.active);
  const steps = useTodaySteps();
  const u = units(settings?.unit_system ?? 'metric');
  const [refreshing, setRefreshing] = React.useState(false);

  const planned = goal?.workouts_per_week ?? 0;
  const week = useMemo(() => weekStats(sessions, startOfWeek(), planned), [sessions, planned]);
  const todayIndex = ((new Date().getDay() + 6) % 7) + 1;
  const preferred = goal?.preferred_days ?? [];

  const activeProgram = programs.find((p) => p.id === userPrograms.find((x) => x.is_active)?.program_id);
  const kcalToday = Math.round(sumMacros(entries).kcal);
  const minutesToday = Math.round(
    sessions.filter((s) => toISODate(new Date(s.finished_at)) === today).reduce((n, s) => n + s.duration_sec, 0) / 60,
  );
  const lastSession = sessions[0];
  const unread = notifications.some((n) => !n.is_read);

  const recommendations = useMemo(
    () => recommendPrograms({ programs: programs.filter((p) => p.id !== activeProgram?.id), goal, level: profile?.fitness_level, sessions }),
    [programs, goal, profile?.fitness_level, sessions, activeProgram?.id],
  );

  const weights = measurements.filter((m) => m.weight_kg != null);
  const currentWeight = profile?.weight_kg ?? weights[0]?.weight_kg ?? null;
  const startWeight = goal?.start_weight_kg ?? weights[weights.length - 1]?.weight_kg ?? null;
  const delta = currentWeight != null && startWeight != null ? currentWeight - startWeight : null;
  const progress = weightProgress(startWeight, currentWeight, goal?.target_weight_kg ?? null);

  const banner = active
    ? { title: 'Продолжить\nтренировку', subtitle: `${active.programName} · не завершена`, onPress: () => router.push('/session') }
    : activeProgram
      ? {
          title: 'Продолжить\nпрограмму',
          subtitle: `${activeProgram.name} · ${activeProgram.duration_min} мин`,
          onPress: () => router.push({ pathname: '/workout/[id]', params: { id: activeProgram.id } }),
        }
      : { title: 'Выбрать\nпрограмму', subtitle: 'Каталог тренировок', onPress: () => router.push('/(tabs)/workouts') };

  const refresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.pink} colors={[colors.pink]} />}>
      {/* Шапка */}
      <View style={styles.header}>
        <Logo size={38} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Tap onPress={() => router.push('/notifications')} label="Уведомления" hitSlop={8}>
            <Ionicons name="notifications-outline" size={26} color={colors.text} />
            {unread ? <View style={styles.dot} /> : null}
          </Tap>
          <Tap onPress={() => router.push('/(tabs)/profile')} label="Профиль">
            <Avatar profile={profile} size={42} />
          </Tap>
        </View>
      </View>

      {/* Приветствие */}
      <View style={{ marginTop: space.xl, marginBottom: space.xl }}>
        <Wave style={{ position: 'absolute', right: -space.xl, top: -22 }} />
        <T v="h1" style={{ fontSize: 30, lineHeight: 36 }} numberOfLines={2}>
          {greeting()}
          {profile?.first_name ? `, ${profile.first_name}` : ''}!
        </T>
        <T v="body" color={colors.text2} style={{ fontSize: 16, marginTop: 4 }}>
          Готов к тренировке?
        </T>
      </View>

      {/* Недельная карточка */}
      <FadeIn>
        <Card onPress={() => router.push('/program')} style={styles.weekCard}>
          <Ring size={64} stroke={7} value={planned > 0 ? week.done / planned : 0}>
            <Ionicons name="flame" size={24} color={colors.pink} />
          </Ring>
          <View style={{ marginLeft: space.md, marginRight: space.sm }}>
            <T v="num" style={{ fontSize: 22 }}>
              {week.done}
              {planned > 0 ? (
                <T v="bodyM" style={{ fontSize: 17 }}>
                  {' из '}
                  <T v="num" style={{ fontSize: 22 }}>
                    {planned}
                  </T>
                </T>
              ) : null}
            </T>
            <T v="caption" style={{ fontSize: 12, lineHeight: 15 }}>
              {plural(planned > 0 ? planned : week.done, 'тренировка', 'тренировки', 'тренировок')}
              {'\n'}на неделе
            </T>
          </View>
          <View style={styles.days}>
            {WEEKDAYS_SHORT.map((d, i) => {
              const day = i + 1;
              const done = week.doneDays.has(day);
              const upcoming = !done && preferred.includes(day) && day >= todayIndex;
              return (
                <View key={d} style={{ alignItems: 'center', gap: 7 }}>
                  <T v="small" color={done || upcoming ? colors.text : colors.muted} style={{ fontSize: 10.5 }}>
                    {d}
                  </T>
                  {done ? (
                    <LinearGradient colors={gradient} style={styles.dayDot}>
                      <Ionicons name="checkmark" size={12} color={colors.text} />
                    </LinearGradient>
                  ) : upcoming ? (
                    <View style={[styles.dayDot, { borderWidth: 1.5, borderColor: colors.muted }]} />
                  ) : (
                    <View style={[styles.dayDot, { backgroundColor: colors.card2 }]} />
                  )}
                </View>
              );
            })}
          </View>
        </Card>
      </FadeIn>

      {/* Баннер программы */}
      <FadeIn delay={60}>
        <Tap onPress={banner.onPress} style={styles.banner} label={banner.title.replace('\n', ' ')}>
          <LinearGradient colors={['#F4589C', '#D92E79', '#B81F66']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          {activeProgram?.image_url && !active ? (
            <Cover imageUrl={activeProgram.image_url} style={styles.bannerImage} rounded={0} />
          ) : (
            <View style={styles.bannerArt} pointerEvents="none">
              <Svg width={170} height={130} viewBox="0 0 170 130">
                <Circle cx="100" cy="65" r="62" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" fill="none" />
                <Circle cx="100" cy="65" r="44" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" fill="none" />
                <Circle cx="100" cy="65" r="27" fill="rgba(255,255,255,0.12)" />
              </Svg>
              <MaterialCommunityIcons name={active ? 'timer-outline' : 'run-fast'} size={44} color="rgba(255,255,255,0.92)" style={styles.bannerIcon} />
            </View>
          )}
          <View style={styles.play}>
            <Ionicons name="play" size={18} color={colors.crimson} style={{ marginLeft: 2 }} />
          </View>
          <View style={{ flex: 1, marginLeft: space.lg }}>
            <T v="h2" style={{ fontSize: 20, lineHeight: 25 }}>
              {banner.title}
            </T>
            <T v="caption" color="rgba(255,255,255,0.82)" numberOfLines={1} style={{ marginTop: 4, maxWidth: 200 }}>
              {banner.subtitle}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Tap>
      </FadeIn>

      {/* Плитки */}
      <FadeIn delay={120} style={styles.tiles}>
        {TILES.map((t) => (
          <Tap key={t.title} onPress={() => router.push(t.href)} style={styles.tileWrap} label={t.title}>
            <View style={styles.tile}>
              <Ionicons name={t.icon} size={24} color={colors.pink} />
              <T v="bodyM" style={{ fontSize: 15.5 }} numberOfLines={1}>
                {t.title}
              </T>
            </View>
          </Tap>
        ))}
      </FadeIn>

      {/* Мой прогресс */}
      <SectionTitle title="Мой прогресс" action="Подробнее" onAction={() => router.push('/(tabs)/progress')} />
      <FadeIn delay={180} style={{ flexDirection: 'row', gap: space.md }}>
        <Stat icon="footsteps" value={steps == null ? '—' : formatNumber(steps)} label="шагов" />
        <Stat icon="flame" value={formatNumber(kcalToday)} label="ккал съедено" onPress={() => router.push('/(tabs)/nutrition')} />
        <Stat icon="time-outline" value={String(minutesToday)} label="мин активности" />
      </FadeIn>

      {/* Неделя */}
      <Card style={{ marginTop: space.md, flexDirection: 'row' }}>
        <WeekCell value={planned > 0 ? String(planned) : '—'} label="запланировано" />
        <View style={styles.divider} />
        <WeekCell value={String(week.done)} label="выполнено" />
        <View style={styles.divider} />
        <WeekCell value={planned > 0 ? `${week.percent}%` : '—'} label="плана недели" accent />
      </Card>

      {/* Цель */}
      <SectionTitle title="Моя цель" action="Изменить" onAction={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })} />
      <Card onPress={() => router.push('/measurements')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={styles.goalIcon}>
            <Ionicons name="flag" size={20} color={colors.pink} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="bodyM">{goal ? GOAL_LABELS[goal.goal_type] : 'Цель не задана'}</T>
            <T v="caption">
              {delta == null || Math.abs(delta) < 0.05
                ? 'Запишите вес, чтобы видеть динамику'
                : `${delta > 0 ? '+' : '−'}${u.weight(Math.abs(delta))} с начала`}
            </T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: space.lg }}>
          <View style={{ flex: 1 }}>
            <T v="caption">Текущий вес</T>
            <T v="num" style={{ fontSize: 20 }}>
              {u.weight(currentWeight)}
            </T>
          </View>
          <View style={{ flex: 1 }}>
            <T v="caption">Целевой вес</T>
            <T v="num" style={{ fontSize: 20 }} color={goal?.target_weight_kg ? colors.text : colors.muted}>
              {goal?.target_weight_kg ? u.weight(goal.target_weight_kg) : 'не задан'}
            </T>
          </View>
        </View>
        {progress != null ? (
          <View style={{ marginTop: space.md }}>
            <ProgressBar value={progress} />
            <T v="small" style={{ marginTop: 6 }}>
              {Math.round(progress * 100)}% пути к цели
            </T>
          </View>
        ) : null}
      </Card>

      {/* Рекомендации */}
      {recommendations.length > 0 ? (
        <>
          <SectionTitle title="Рекомендации" action="Все" onAction={() => router.push('/(tabs)/workouts')} />
          <T v="caption" style={{ marginTop: -6, marginBottom: space.md }}>
            Подбор по вашей цели, уровню и истории тренировок
          </T>
          {recommendations.map((r) => (
            <ProgramCard key={r.program.id} program={r.program} exercises={counts[r.program.id]?.exercises} note={r.reason} />
          ))}
        </>
      ) : null}

      {/* Последняя тренировка */}
      <SectionTitle title="Последняя тренировка" action={lastSession ? 'История' : undefined} onAction={() => router.push('/history')} />
      {lastSession ? (
        <Card onPress={() => router.push({ pathname: '/history/[id]', params: { id: lastSession.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={styles.goalIcon}>
            <Ionicons name="checkmark-done" size={20} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="bodyM" numberOfLines={1}>
              {lastSession.program_name}
            </T>
            <T v="caption">
              {formatShortDate(lastSession.finished_at)} · {formatDuration(lastSession.duration_sec)} · {lastSession.sets_count}{' '}
              {plural(lastSession.sets_count, 'подход', 'подхода', 'подходов')}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Card>
      ) : (
        <Card>
          <T v="caption">Здесь появится ваша первая завершённая тренировка.</T>
        </Card>
      )}

      {/* Достижения */}
      <SectionTitle title="Достижения" action="Все" onAction={() => router.push('/achievements')} />
      <Card onPress={() => router.push('/achievements')} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={styles.goalIcon}>
          <Ionicons name="trophy" size={20} color={colors.pink} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="bodyM">
            {unlocked.length} из {achievements.length} открыто
          </T>
          <View style={{ marginTop: 8 }}>
            <ProgressBar value={achievements.length ? unlocked.length / achievements.length : 0} height={6} />
          </View>
        </View>
      </Card>
    </Screen>
  );
}

function Stat({ icon, value, label, onPress }: { icon: IconName; value: string; label: string; onPress?: () => void }) {
  return (
    <Card onPress={onPress} style={{ flex: 1, padding: space.md, paddingVertical: 14 }}>
      <Ionicons name={icon} size={22} color={colors.pink} />
      <T v="num" style={{ marginTop: 8, fontSize: 22 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </T>
      <T v="caption" style={{ fontSize: 12, lineHeight: 15, minHeight: 30 }} numberOfLines={2}>
        {label}
      </T>
    </Card>
  );
}

function WeekCell({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <T v="num" style={{ fontSize: 20 }} color={accent ? colors.pink : colors.text}>
        {value}
      </T>
      <T v="caption" style={{ fontSize: 12 }}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52 },
  dot: { position: 'absolute', top: 1, right: 1, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.pink, borderWidth: 1.5, borderColor: colors.bg },
  weekCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18 },
  days: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', maxWidth: 190, marginLeft: 'auto' },
  dayDot: { width: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  banner: {
    marginTop: space.lg,
    height: 112,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  bannerArt: { position: 'absolute', right: 26, top: -9, width: 170, height: 130, alignItems: 'center', justifyContent: 'center' },
  bannerIcon: { position: 'absolute', left: 78, top: 43 },
  bannerImage: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '46%', opacity: 0.85 },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginTop: space.lg - 6 },
  tileWrap: { width: '50%', padding: 6 },
  tile: {
    height: 62,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  divider: { width: 1, backgroundColor: colors.border },
  goalIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
});
