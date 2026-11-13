import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';

import { useGoal, useProfile, useSaveGoal, useSettings, useUpdateProfile } from '@/api/profile';
import { uploadAvatar, useAddMeasurement } from '@/api/progress';
import { Avatar } from '@/components/Avatar';
import { Field } from '@/components/Field';
import { Button, Chip, ErrorText, Header, Loading, notify, Screen, T } from '@/components/ui';
import { GOAL_LABELS, LEVEL_LABELS, parseNumber, toISODate, units } from '@/lib/format';
import { humanError } from '@/lib/supabase';
import { nameSchema } from '@/lib/validation';
import { colors, space } from '@/theme';
import type { FitnessLevel, GoalType } from '@/types/db';

const schema = z.object({
  first_name: nameSchema('имя'),
  last_name: nameSchema('фамилию'),
  height: z.string().trim().min(1, 'Укажите рост'),
  weight: z.string().trim().min(1, 'Укажите вес'),
});
type Form = z.infer<typeof schema>;

export default function EditProfile() {
  const profile = useProfile();
  const goal = useGoal();
  const { data: settings } = useSettings();
  const u = units(settings?.unit_system ?? 'metric');
  const updateProfile = useUpdateProfile();
  const saveGoal = useSaveGoal();
  const addMeasurement = useAddMeasurement();

  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [level, setLevel] = useState<FitnessLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const filled = useRef(false);

  const { control, handleSubmit, reset, setError: setFieldError } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: '', last_name: '', height: '', weight: '' },
  });

  useEffect(() => {
    if (filled.current || !profile.data || goal.isPending) return;
    filled.current = true;
    const p = profile.data;
    reset({
      first_name: p.first_name,
      last_name: p.last_name,
      height: p.height_cm != null ? String(u.toLength(p.height_cm)) : '',
      weight: p.weight_kg != null ? String(u.toWeight(p.weight_kg)) : '',
    });
    setGoalType(goal.data?.goal_type ?? null);
    setLevel(p.fitness_level);
  }, [profile.data, goal.isPending, goal.data, reset, u]);

  const changeAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
      if (result.canceled || !result.assets[0]) return;
      setAvatarBusy(true);
      const path = await uploadAvatar(result.assets[0].uri);
      await updateProfile.mutateAsync({ avatar_url: path });
    } catch (e) {
      notify('Не удалось обновить аватар', humanError(e));
    } finally {
      setAvatarBusy(false);
    }
  };

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const h = parseNumber(v.height);
    const w = parseNumber(v.weight);
    const heightCm = h == null ? null : u.fromLength(h);
    const weightKg = w == null ? null : u.fromWeight(w);
    if (heightCm == null || heightCm < 100 || heightCm > 250) return setFieldError('height', { message: 'Проверьте значение роста' });
    if (weightKg == null || weightKg < 30 || weightKg > 300) return setFieldError('weight', { message: 'Проверьте значение веса' });
    try {
      const weightChanged = profile.data?.weight_kg !== weightKg;
      await updateProfile.mutateAsync({
        first_name: v.first_name.trim(),
        last_name: v.last_name.trim(),
        height_cm: heightCm,
        weight_kg: weightKg,
        fitness_level: level,
      });
      // новый вес попадает в историю измерений
      if (weightChanged) {
        await addMeasurement.mutateAsync({ measured_on: toISODate(), weight_kg: weightKg, chest_cm: null, waist_cm: null, hips_cm: null, arm_cm: null, leg_cm: null });
      }
      if (goalType && goalType !== goal.data?.goal_type) {
        await saveGoal.mutateAsync({
          goal_type: goalType,
          workouts_per_week: goal.data?.workouts_per_week ?? 3,
          session_minutes: goal.data?.session_minutes ?? 45,
          preferred_days: goal.data?.preferred_days ?? [],
        });
      }
      router.back();
    } catch (e) {
      setError(humanError(e));
    }
  });

  if (profile.isPending) {
    return (
      <Screen header={<Header title="Профиль" />}>
        <Loading />
      </Screen>
    );
  }

  const busy = updateProfile.isPending || saveGoal.isPending || addMeasurement.isPending;

  return (
    <Screen edges={['top', 'bottom']} header={<Header title="Редактирование" />} footer={<Button title="Сохранить" onPress={onSubmit} loading={busy && !avatarBusy} />}>
      <Pressable onPress={changeAvatar} style={{ alignSelf: 'center', alignItems: 'center', marginVertical: space.lg }} accessibilityLabel="Изменить аватар">
        <Avatar profile={profile.data} size={96} />
        <T v="bodyM" color={colors.pink} style={{ marginTop: space.sm, fontSize: 14 }}>
          {avatarBusy ? 'Загрузка…' : 'Изменить фото'}
        </T>
      </Pressable>

      <ErrorText>{error}</ErrorText>
      <Field control={control} name="first_name" label="Имя" autoCapitalize="words" />
      <Field control={control} name="last_name" label="Фамилия" autoCapitalize="words" />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Field control={control} name="height" label="Рост" suffix={u.lengthUnit} keyboardType="decimal-pad" maxLength={5} />
        </View>
        <View style={{ flex: 1 }}>
          <Field control={control} name="weight" label="Вес" suffix={u.weightUnit} keyboardType="decimal-pad" maxLength={5} />
        </View>
      </View>

      <T v="caption" style={{ marginTop: space.sm, marginBottom: 8 }}>
        Цель
      </T>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        {(Object.keys(GOAL_LABELS) as GoalType[]).map((g) => (
          <Chip key={g} label={GOAL_LABELS[g]} active={goalType === g} onPress={() => setGoalType(g)} />
        ))}
      </View>

      <T v="caption" style={{ marginTop: space.xl, marginBottom: 8 }}>
        Уровень подготовки
      </T>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        {(Object.keys(LEVEL_LABELS) as FitnessLevel[]).map((l) => (
          <Chip key={l} label={LEVEL_LABELS[l]} active={level === l} onPress={() => setLevel(l)} />
        ))}
      </View>
    </Screen>
  );
}
