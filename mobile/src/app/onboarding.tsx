// Анкета пользователя: 5 шагов + экран завершения.
// Этот же экран открывается из профиля (?edit=1) для изменения анкеты.
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';

import { useGoal, useProfile, useSaveOnboarding, useSettings, type OnboardingData } from '@/api/profile';
import { Button, Chip, ErrorText, FadeIn, IconButton, Input, Loading, OptionCard, ProgressBar, Screen, T, type IconName } from '@/components/ui';
import { ageFrom, GOAL_LABELS, LEVEL_LABELS, parseNumber, units, WEEKDAYS_SHORT } from '@/lib/format';
import { humanError, supabase } from '@/lib/supabase';
import { maskRuDate, parseRuDate, toRuDate } from '@/lib/validation';
import { colors, gradient, space } from '@/theme';
import type { FitnessLevel, Gender, GoalType } from '@/types/db';

const STEPS = ['Личная информация', 'Физическая подготовка', 'Ваша цель', 'Тренировочный график', 'Ограничения'];

const LEVELS: { value: FitnessLevel; icon: IconName; text: string }[] = [
  { value: 'beginner', icon: 'leaf-outline', text: 'Тренируюсь недавно или после долгого перерыва' },
  { value: 'intermediate', icon: 'fitness-outline', text: 'Регулярно занимаюсь от полугода' },
  { value: 'advanced', icon: 'flash-outline', text: 'Тренируюсь несколько лет, знаю технику' },
];

const GOALS: { value: GoalType; icon: IconName }[] = [
  { value: 'muscle_gain', icon: 'barbell-outline' },
  { value: 'weight_loss', icon: 'trending-down-outline' },
  { value: 'maintenance', icon: 'heart-outline' },
  { value: 'strength', icon: 'flash-outline' },
  { value: 'endurance', icon: 'speedometer-outline' },
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Женский' },
  { value: 'male', label: 'Мужской' },
  { value: 'other', label: 'Другое' },
];

const MINUTES = [20, 30, 45, 60, 90];

interface FormState {
  birth: string;
  height: string;
  weight: string;
  gender: Gender | null;
  level: FitnessLevel | null;
  goal: GoalType | null;
  targetWeight: string;
  perWeek: number;
  minutes: number;
  days: number[];
  injuries: string;
  restrictions: string;
  notes: string;
}

const EMPTY: FormState = {
  birth: '',
  height: '',
  weight: '',
  gender: null,
  level: null,
  goal: null,
  targetWeight: '',
  perWeek: 3,
  minutes: 45,
  days: [],
  injuries: '',
  restrictions: '',
  notes: '',
};

export default function Onboarding() {
  const isEdit = useLocalSearchParams<{ edit?: string }>().edit === '1';
  const profile = useProfile();
  const goal = useGoal();
  const settings = useSettings();
  const save = useSaveOnboarding();
  const u = units(settings.data?.unit_system ?? 'metric');

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [done, setDone] = useState(false);
  const prefilled = useRef(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Предзаполнение при редактировании анкеты
  const loaded = !profile.isPending && !goal.isPending && !settings.isPending;
  useEffect(() => {
    if (!loaded || prefilled.current) return;
    prefilled.current = true;
    const p = profile.data;
    const g = goal.data;
    const s = settings.data;
    const system = units(s?.unit_system ?? 'metric');
    setForm({
      birth: toRuDate(p?.birth_date),
      height: p?.height_cm != null ? String(system.toLength(p.height_cm)) : '',
      weight: p?.weight_kg != null ? String(system.toWeight(p.weight_kg)) : '',
      gender: p?.gender ?? null,
      level: p?.fitness_level ?? null,
      goal: g?.goal_type ?? null,
      targetWeight: g?.target_weight_kg != null ? String(system.toWeight(g.target_weight_kg)) : '',
      perWeek: g?.workouts_per_week ?? 3,
      minutes: g?.session_minutes ?? 45,
      days: g?.preferred_days ?? [],
      injuries: s?.injuries ?? '',
      restrictions: s?.exercise_restrictions ?? '',
      notes: s?.special_notes ?? '',
    });
  }, [loaded, profile.data, goal.data, settings.data]);

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (step === 0) {
      const iso = parseRuDate(form.birth);
      const age = ageFrom(iso);
      if (!iso) e.birth = 'Укажите дату в формате ДД.ММ.ГГГГ';
      else if (age == null || age < 12 || age > 100) e.birth = 'Возраст должен быть от 12 до 100 лет';
      const h = parseNumber(form.height);
      const hCm = h == null ? null : u.fromLength(h);
      if (hCm == null || hCm < 100 || hCm > 250) e.height = u.imperial ? 'Укажите рост от 40 до 98 дюймов' : 'Укажите рост от 100 до 250 см';
      const w = parseNumber(form.weight);
      const wKg = w == null ? null : u.fromWeight(w);
      if (wKg == null || wKg < 30 || wKg > 300) e.weight = u.imperial ? 'Укажите вес от 66 до 660 фунтов' : 'Укажите вес от 30 до 300 кг';
    }
    if (step === 1 && !form.level) e.level = 'Выберите уровень подготовки';
    if (step === 2) {
      if (!form.goal) e.goal = 'Выберите основную цель';
      if (form.targetWeight.trim()) {
        const t = parseNumber(form.targetWeight);
        const tKg = t == null ? null : u.fromWeight(t);
        if (tKg == null || tKg < 30 || tKg > 300) e.targetWeight = 'Проверьте значение целевого веса';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    const target = parseNumber(form.targetWeight);
    const data: OnboardingData = {
      birth_date: parseRuDate(form.birth),
      height_cm: u.fromLength(parseNumber(form.height) ?? 0),
      weight_kg: u.fromWeight(parseNumber(form.weight) ?? 0),
      gender: form.gender,
      fitness_level: form.level ?? 'beginner',
      goal_type: form.goal ?? 'maintenance',
      target_weight_kg: target == null ? null : u.fromWeight(target),
      workouts_per_week: form.perWeek,
      session_minutes: form.minutes,
      preferred_days: [...form.days].sort((a, b) => a - b),
      injuries: form.injuries.trim(),
      exercise_restrictions: form.restrictions.trim(),
      special_notes: form.notes.trim(),
    };
    save.mutate(
      { data, isEdit },
      {
        onSuccess: () => {
          if (isEdit) router.back();
          else setDone(true);
        },
      },
    );
  };

  const next = () => {
    if (!validate()) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
    else if (isEdit) router.back();
  };

  if (!loaded) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  if (done) return <Done />;

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <View style={{ paddingTop: space.sm, paddingBottom: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 44 }}>
            {step > 0 || isEdit ? <IconButton icon={step > 0 ? 'chevron-back' : 'close'} label="Назад" onPress={back} /> : <View style={{ width: 40 }} />}
            <T v="caption" center style={{ flex: 1 }}>
              Шаг {step + 1} из {STEPS.length}
            </T>
            {!isEdit && step === 0 ? (
              <T v="caption" color={colors.text2} onPress={() => supabase.auth.signOut()} style={{ width: 50, textAlign: 'right' }}>
                Выйти
              </T>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>
          <View style={{ marginTop: space.md }}>
            <ProgressBar value={(step + 1) / STEPS.length} height={6} />
          </View>
        </View>
      }
      footer={<Button title={step === STEPS.length - 1 ? (isEdit ? 'Сохранить' : 'Завершить') : 'Далее'} onPress={next} loading={save.isPending} />}
    >
      <FadeIn key={step}>
        <T v="h1" style={{ marginTop: space.sm }}>
          {STEPS[step]}
        </T>

        {step === 0 ? (
          <View style={{ marginTop: space.xl }}>
            <T v="caption" style={{ marginBottom: space.xl, fontSize: 14 }}>
              Эти данные нужны для расчёта нагрузки и ориентировочной нормы калорий
            </T>
            <Input
              label="Дата рождения"
              placeholder="ДД.ММ.ГГГГ"
              keyboardType="number-pad"
              value={form.birth}
              onChangeText={(t) => set('birth', maskRuDate(t))}
              error={errors.birth}
              maxLength={10}
            />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Input containerStyle={{ flex: 1 }} label="Рост" placeholder={u.imperial ? '67' : '170'} keyboardType="decimal-pad" suffix={u.lengthUnit} value={form.height} onChangeText={(t) => set('height', t)} error={errors.height} maxLength={5} />
              <Input containerStyle={{ flex: 1 }} label="Текущий вес" placeholder={u.imperial ? '150' : '68'} keyboardType="decimal-pad" suffix={u.weightUnit} value={form.weight} onChangeText={(t) => set('weight', t)} error={errors.weight} maxLength={5} />
            </View>
            <T v="caption" style={{ marginBottom: 8 }}>
              Пол (необязательно)
            </T>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              {GENDERS.map((g) => (
                <Chip key={g.value} label={g.label} active={form.gender === g.value} onPress={() => set('gender', form.gender === g.value ? null : g.value)} />
              ))}
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ marginTop: space.xl }}>
            <T v="caption" style={{ marginBottom: space.xl, fontSize: 14 }}>
              Мы подберём программы подходящей сложности
            </T>
            {LEVELS.map((l) => (
              <OptionCard key={l.value} title={LEVEL_LABELS[l.value]} subtitle={l.text} icon={l.icon} selected={form.level === l.value} onPress={() => set('level', l.value)} />
            ))}
            <ErrorText>{errors.level}</ErrorText>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ marginTop: space.xl }}>
            <T v="caption" style={{ marginBottom: space.xl, fontSize: 14 }}>
              Выберите одну основную цель — её можно изменить позже
            </T>
            {GOALS.map((g) => (
              <OptionCard key={g.value} title={GOAL_LABELS[g.value]} icon={g.icon} selected={form.goal === g.value} onPress={() => set('goal', g.value)} />
            ))}
            <ErrorText>{errors.goal}</ErrorText>
            <Input
              label="Целевой вес (необязательно)"
              placeholder="Например, 65"
              keyboardType="decimal-pad"
              suffix={u.weightUnit}
              value={form.targetWeight}
              onChangeText={(t) => set('targetWeight', t)}
              error={errors.targetWeight}
              maxLength={5}
            />
          </View>
        ) : null}

        {step === 3 ? (
          <View style={{ marginTop: space.xl }}>
            <T v="bodyM" style={{ marginBottom: space.md }}>
              Тренировок в неделю
            </T>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <Chip key={n} label={String(n)} active={form.perWeek === n} onPress={() => set('perWeek', n)} />
              ))}
            </View>
            <T v="bodyM" style={{ marginTop: space.xxl, marginBottom: space.md }}>
              Продолжительность тренировки
            </T>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              {MINUTES.map((m) => (
                <Chip key={m} label={`${m} мин`} active={form.minutes === m} onPress={() => set('minutes', m)} />
              ))}
            </View>
            <T v="bodyM" style={{ marginTop: space.xxl }}>
              Предпочитаемые дни
            </T>
            <T v="caption" style={{ marginBottom: space.md }}>
              Необязательно — используется для недельного плана и напоминаний
            </T>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              {WEEKDAYS_SHORT.map((d, i) => {
                const day = i + 1;
                const active = form.days.includes(day);
                return <Chip key={d} label={d} active={active} onPress={() => set('days', active ? form.days.filter((x) => x !== day) : [...form.days, day])} />;
              })}
            </View>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={{ marginTop: space.xl }}>
            <T v="caption" style={{ marginBottom: space.xl, fontSize: 14 }}>
              Все поля необязательны. Информация видна только вам и помогает учитывать ограничения при выборе тренировок.
            </T>
            <Input label="Травмы" placeholder="Например: травма колена в 2024 году" multiline value={form.injuries} onChangeText={(t) => set('injuries', t)} maxLength={1000} />
            <Input label="Ограничения по упражнениям" placeholder="Например: нельзя прыжки и осевую нагрузку" multiline value={form.restrictions} onChangeText={(t) => set('restrictions', t)} maxLength={1000} />
            <Input label="Особые пожелания" placeholder="Например: предпочитаю тренировки дома" multiline value={form.notes} onChangeText={(t) => set('notes', t)} maxLength={1000} />
          </View>
        ) : null}

        <ErrorText>{save.isError ? humanError(save.error) : null}</ErrorText>
      </FadeIn>
    </Screen>
  );
}

function Done() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: Platform.OS !== 'web', bounciness: 12, speed: 6 }).start();
  }, [a]);
  return (
    <Screen edges={['top', 'bottom']} scroll={false} footer={<Button title="Перейти на главную" onPress={() => router.replace('/(tabs)')} />}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ transform: [{ scale: a }], opacity: a.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], easing: Easing.linear }) }}>
          <LinearGradient colors={gradient} style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={52} color={colors.text} />
          </LinearGradient>
        </Animated.View>
        <T v="h1" center style={{ marginTop: space.xxl }}>
          Всё готово!
        </T>
        <T v="body" center color={colors.text2} style={{ marginTop: space.md, maxWidth: 300 }}>
          Профиль настроен. Мы рассчитали ориентировочные цели по питанию — их можно изменить в разделе «Питание».
        </T>
      </View>
    </Screen>
  );
}
