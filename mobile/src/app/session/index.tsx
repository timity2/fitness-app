// Интерактивный режим тренировки: подходы, ввод веса и повторений, таймер отдыха, пауза.
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useNotificationPrefs } from '@/api/notifications';
import { useSettings } from '@/api/profile';
import { useAllSets, useFinishWorkout } from '@/api/workouts';
import { Cover } from '@/components/Cover';
import { Button, Card, confirm, EmptyState, ErrorText, IconButton, ProgressBar, Ring, Screen, Sheet, T, Tap } from '@/components/ui';
import { formatClock, parseNumber, units } from '@/lib/format';
import { cancelRestEnd, scheduleRestEnd } from '@/lib/notifications';
import { humanError } from '@/lib/supabase';
import { elapsedSec, restLeftSec, totalSets, useWorkout } from '@/store/workout';
import { colors, fonts, radius, space } from '@/theme';

/** Текущее время, обновляемое дважды в секунду, пока тренировка не на паузе */
function useNow(running: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [running]);
  return now;
}

export default function Session() {
  const w = useWorkout((s) => s.active);
  const actions = useWorkout();
  const { data: settings } = useSettings();
  const { data: prefs } = useNotificationPrefs();
  const { data: history = [] } = useAllSets();
  const finish = useFinishWorkout();
  const u = units(settings?.unit_system ?? 'metric');
  const [menu, setMenu] = useState(false);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const paused = w?.pausedAt != null;
  const now = useNow(!!w && !paused);
  const ex = w ? w.exercises[w.exIndex] : null;
  const restLeft = w?.rest ? restLeftSec(w.rest, now) : 0;
  const restRunning = !!w?.rest && w.rest.pausedLeft == null;

  // Подстановка значений для нового подхода: последний вес в этой тренировке,
  // иначе — вес из прошлой тренировки; повторения — из плана.
  const setKey = w ? `${w.exIndex}:${w.setIndex}` : '';
  useEffect(() => {
    if (!w || !ex) return;
    const inThis = [...w.done].reverse().find((d) => d.position === ex.position);
    const before = [...history].reverse().find((s) => s.exercise_id === ex.exerciseId && s.weight_kg > 0);
    const kg = inThis?.weightKg ?? before?.weight_kg ?? 0;
    setWeight(kg > 0 ? String(u.toWeight(kg)) : '');
    setReps(String(inThis?.reps ?? ex.reps));
    setInputError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setKey, history.length]);

  // Окончание отдыха: вибрация и переход к подходу
  const restEndsAt = w?.rest?.endsAt;
  const fired = useRef<number | null>(null);
  useEffect(() => {
    if (!w?.rest || !restRunning || restLeft > 0 || fired.current === w.rest.endsAt) return;
    fired.current = w.rest.endsAt;
    if (settings?.timer_vibration !== false && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    actions.skipRest();
  }, [restLeft, restRunning, w?.rest, settings?.timer_vibration, actions]);

  // Сигнал в фоне: локальное уведомление на момент окончания отдыха (если уведомления разрешены)
  useEffect(() => {
    if (!restEndsAt || !restRunning || !prefs?.enabled) return;
    const seconds = (restEndsAt - Date.now()) / 1000;
    scheduleRestEnd(seconds, settings?.timer_sound !== false).catch(() => undefined);
    return () => {
      cancelRestEnd().catch(() => undefined);
    };
  }, [restEndsAt, restRunning, prefs?.enabled, settings?.timer_sound]);

  const doneByExercise = useMemo(() => {
    const map = new Map<number, number>();
    for (const d of w?.done ?? []) map.set(d.position, (map.get(d.position) ?? 0) + 1);
    return map;
  }, [w?.done]);

  if (!w || !ex) {
    return (
      <Screen edges={['top', 'bottom']}>
        <EmptyState icon="barbell-outline" title="Нет активной тренировки" text="Выберите программу и нажмите «Начать тренировку»." action="К тренировкам" onAction={() => router.replace('/(tabs)/workouts')} />
      </Screen>
    );
  }

  const total = totalSets(w);
  const passed = w.done.length + w.skipped;
  const elapsed = elapsedSec(w, now);
  const setsHere = w.done.filter((d) => d.position === ex.position);

  const complete = () => {
    const wv = weight.trim() === '' ? 0 : parseNumber(weight);
    const rv = parseNumber(reps);
    if (wv == null || wv < 0 || u.fromWeight(wv) > 1000) return setInputError('Проверьте рабочий вес');
    if (rv == null || !Number.isInteger(rv) || rv < 1 || rv > 500) return setInputError('Укажите количество повторений от 1 до 500');
    setInputError(null);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    actions.completeSet(u.fromWeight(wv), rv);
  };

  const step = (field: 'weight' | 'reps', delta: number) => {
    if (field === 'weight') {
      const next = Math.max(0, (parseNumber(weight) ?? 0) + delta);
      setWeight(next === 0 ? '' : String(Math.round(next * 100) / 100));
    } else {
      setReps(String(Math.max(1, (parseNumber(reps) ?? 0) + delta)));
    }
  };

  const save = () => {
    setMenu(false);
    finish.mutate(
      { workout: w, durationSec: elapsed },
      {
        onSuccess: (sessionId) => {
          router.replace({ pathname: '/session/summary', params: { id: sessionId } });
          actions.discard();
        },
      },
    );
  };

  const askFinish = () => {
    setMenu(false);
    if (w.done.length === 0) {
      confirm('Завершить без результатов?', 'Вы не выполнили ни одного подхода — тренировка не будет сохранена.', () => {
        actions.discard();
        router.back();
      }, 'Завершить', true);
      return;
    }
    if (w.completedAll) save();
    else confirm('Завершить тренировку?', `Выполнено подходов: ${w.done.length} из ${total}. Результаты будут сохранены.`, save, 'Завершить');
  };

  const cancelWorkout = () => {
    setMenu(false);
    confirm('Отменить тренировку?', 'Все результаты этой тренировки будут удалены.', () => {
      actions.discard();
      router.back();
    }, 'Отменить тренировку', true);
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <View style={{ paddingTop: space.sm }}>
          <View style={styles.top}>
            <IconButton icon="chevron-down" label="Свернуть" onPress={() => router.back()} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <T v="caption" numberOfLines={1}>
                {w.programName}
              </T>
              <T v="h3" style={{ fontSize: 20, fontVariant: ['tabular-nums'] }} color={paused ? colors.muted : colors.text}>
                {formatClock(elapsed)}
              </T>
            </View>
            <IconButton icon="ellipsis-horizontal" label="Меню тренировки" onPress={() => setMenu(true)} />
          </View>
          <View style={{ marginTop: space.md }}>
            <ProgressBar value={total ? passed / total : 0} height={6} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <T v="small">
                Упражнение {w.exIndex + 1} из {w.exercises.length}
              </T>
              <T v="small">
                Подходы: {passed} из {total}
              </T>
            </View>
          </View>
        </View>
      }
      footer={
        w.completedAll ? (
          <Button title="Завершить тренировку" icon="checkmark" onPress={askFinish} loading={finish.isPending} />
        ) : w.rest ? (
          <Button title="Пропустить отдых" variant="secondary" icon="play-skip-forward" onPress={actions.skipRest} />
        ) : (
          <Button title="Подход выполнен" icon="checkmark" onPress={complete} disabled={paused} />
        )
      }
    >
      <ErrorText>{finish.isError ? `Не удалось сохранить тренировку: ${humanError(finish.error)}. Данные остались на устройстве — попробуйте ещё раз.` : null}</ErrorText>

      {paused ? (
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl, marginTop: space.lg }}>
          <Ionicons name="pause-circle" size={56} color={colors.pink} />
          <T v="h2" style={{ marginTop: space.md }}>
            Пауза
          </T>
          <T v="caption" center style={{ marginTop: 4, marginBottom: space.lg }}>
            Время тренировки и отдыха остановлено
          </T>
          <Button title="Продолжить" icon="play" onPress={actions.togglePause} style={{ alignSelf: 'stretch' }} />
        </Card>
      ) : w.completedAll ? (
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl, marginTop: space.lg }}>
          <Ionicons name="trophy" size={52} color={colors.pink} />
          <T v="h2" center style={{ marginTop: space.md }}>
            Все упражнения пройдены
          </T>
          <T v="caption" center style={{ marginTop: 4 }}>
            Выполнено подходов: {w.done.length} из {total}. Завершите тренировку, чтобы сохранить результат.
          </T>
        </Card>
      ) : w.rest ? (
        <View style={{ alignItems: 'center', marginTop: space.xl }}>
          <T v="caption" style={{ marginBottom: space.lg }}>
            Отдых перед подходом {w.setIndex + 1} · {ex.name}
          </T>
          <Ring size={220} stroke={12} value={w.rest.total > 0 ? restLeft / w.rest.total : 0}>
            <T v="num" style={{ fontSize: 54, lineHeight: 60, fontVariant: ['tabular-nums'] }}>
              {formatClock(restLeft)}
            </T>
            <T v="caption">{w.rest.pausedLeft != null ? 'на паузе' : 'осталось'}</T>
          </Ring>
          <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl, alignSelf: 'stretch' }}>
            <Button title={w.rest.pausedLeft != null ? 'Продолжить' : 'Пауза'} icon={w.rest.pausedLeft != null ? 'play' : 'pause'} variant="secondary" onPress={actions.toggleRestPause} style={{ flex: 1 }} />
            <Button title="+15 с" variant="secondary" icon="add" onPress={() => actions.addRest(15)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', marginTop: space.md }}>
            <Cover categoryId={ex.categoryId} style={{ width: 84, height: 84 }} iconSize={38} rounded={16} />
            <View style={{ flex: 1 }}>
              <T v="h2" numberOfLines={2}>
                {ex.name}
              </T>
              <T v="bodyM" color={colors.pink} style={{ marginTop: 4, fontSize: 14 }} onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: ex.exerciseId } })}>
                Техника выполнения
              </T>
            </View>
          </View>

          <Card style={{ marginTop: space.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T v="h3">
                Подход {w.setIndex + 1} из {ex.sets}
              </T>
              <T v="caption">
                план: {ex.reps} повт. · отдых {ex.restSec} с
              </T>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: space.md }}>
              {Array.from({ length: ex.sets }, (_, i) => (
                <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < w.setIndex ? colors.pink : i === w.setIndex ? colors.pinkLight : colors.card2, opacity: i === w.setIndex ? 0.55 : 1 }} />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
              <Stepper label={`Вес, ${u.weightUnit}`} value={weight} onChange={setWeight} onStep={(d) => step('weight', d * (u.imperial ? 5 : 2.5))} placeholder="0" decimal />
              <Stepper label="Повторения" value={reps} onChange={setReps} onStep={(d) => step('reps', d)} placeholder={String(ex.reps)} />
            </View>
            {inputError ? (
              <T v="caption" color={colors.error} style={{ marginTop: space.md }}>
                {inputError}
              </T>
            ) : null}

            {setsHere.length > 0 ? (
              <View style={{ marginTop: space.lg, gap: 6 }}>
                {setsHere.map((d) => (
                  <View key={d.setNumber} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <T v="caption">
                      Подход {d.setNumber}: {d.weightKg > 0 ? `${u.weight(d.weightKg)} × ` : ''}
                      {d.reps} повт.
                    </T>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>

          <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.md }}>
            <Button title="Пропустить" icon="play-skip-forward-outline" variant="secondary" small onPress={actions.skipSet} style={{ flex: 1 }} />
            <Button title={w.exIndex + 1 < w.exercises.length ? 'Следующее' : 'Завершить'} icon="arrow-forward" variant="secondary" small onPress={actions.nextExercise} style={{ flex: 1 }} />
          </View>
        </>
      )}

      {/* Список упражнений */}
      {!paused ? (
        <View style={{ marginTop: space.xl }}>
          <T v="caption" style={{ marginBottom: space.sm }}>
            План тренировки
          </T>
          {w.exercises.map((e, i) => {
            const done = doneByExercise.get(e.position) ?? 0;
            const current = i === w.exIndex && !w.completedAll;
            return (
              <Pressable key={e.position} onPress={() => actions.goToExercise(i)} style={[styles.planRow, current ? { borderColor: colors.pink } : null]}>
                <View style={[styles.planIndex, done >= e.sets ? { backgroundColor: colors.success } : current ? { backgroundColor: colors.pink } : null]}>
                  {done >= e.sets ? <Ionicons name="checkmark" size={14} color={colors.bg} /> : <T v="small" color={current ? colors.text : colors.text2}>{i + 1}</T>}
                </View>
                <T v="bodyM" numberOfLines={1} style={{ flex: 1, fontSize: 14 }} color={current ? colors.text : colors.text2}>
                  {e.name}
                </T>
                <T v="small">
                  {done}/{e.sets}
                </T>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Sheet visible={menu} onClose={() => setMenu(false)} title="Тренировка">
        <MenuItem
          icon={paused ? 'play' : 'pause'}
          title={paused ? 'Продолжить тренировку' : 'Поставить на паузу'}
          onPress={() => {
            setMenu(false);
            actions.togglePause();
          }}
        />
        <MenuItem icon="checkmark-done" title="Завершить и сохранить" onPress={askFinish} />
        <MenuItem
          icon="time-outline"
          title="Продолжить позже"
          subtitle="Прогресс сохранится, тренировку можно возобновить с главной"
          onPress={() => {
            setMenu(false);
            if (!paused) actions.togglePause();
            router.back();
          }}
        />
        <MenuItem icon="trash-outline" title="Отменить тренировку" danger onPress={cancelWorkout} />
      </Sheet>
    </Screen>
  );
}

function Stepper({ label, value, onChange, onStep, placeholder, decimal }: { label: string; value: string; onChange: (v: string) => void; onStep: (direction: 1 | -1) => void; placeholder: string; decimal?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <T v="caption" center style={{ marginBottom: 6 }}>
        {label}
      </T>
      <View style={styles.stepper}>
        <Tap onPress={() => onStep(-1)} style={styles.stepButton} label={`Уменьшить: ${label}`}>
          <Ionicons name="remove" size={20} color={colors.text} />
        </Tap>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(decimal ? /[^0-9.,]/g : /\D/g, '').slice(0, 6))}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          selectionColor={colors.pink}
          style={styles.stepInput}
          accessibilityLabel={label}
        />
        <Tap onPress={() => onStep(1)} style={styles.stepButton} label={`Увеличить: ${label}`}>
          <Ionicons name="add" size={20} color={colors.text} />
        </Tap>
      </View>
    </View>
  );
}

function MenuItem({ icon, title, subtitle, onPress, danger }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; subtitle?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed ? { opacity: 0.6 } : null]}>
      <Ionicons name={icon} size={20} color={danger ? colors.error : colors.pink} />
      <View style={{ flex: 1 }}>
        <T v="bodyM" color={danger ? colors.error : colors.text}>
          {title}
        </T>
        {subtitle ? <T v="caption">{subtitle}</T> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', height: 48 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, height: 58, paddingHorizontal: 6 },
  stepButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  stepInput: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 22,
    padding: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, height: 46, paddingHorizontal: space.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginBottom: 8 },
  planIndex: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.border },
});
