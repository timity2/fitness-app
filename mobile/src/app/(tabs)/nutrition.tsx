// Раздел «Питание»: дневник по приёмам пищи, КБЖУ, вода, история по датам.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAddWater, useDeleteEntry, useDeleteWater, useNutritionEntries, useUpdateEntry, useWater, useWaterHistory } from '@/api/nutrition';
import { useSettings, useUpdateSettings } from '@/api/profile';
import { BarChart } from '@/components/Charts';
import { Button, Card, Chip, confirm, ErrorText, IconButton, InfoBox, Input, ProgressBar, Ring, Screen, SectionTitle, Sheet, T, Tap } from '@/components/ui';
import { entryMacros, sumMacros } from '@/lib/calc';
import { addDays, formatNumber, formatShortDate, MEAL_LABELS, parseISODate, parseNumber, relativeDay, toISODate, WEEKDAYS_SHORT } from '@/lib/format';
import { humanError } from '@/lib/supabase';
import { colors, space } from '@/theme';
import type { MealType, NutritionEntry } from '@/types/db';

const MEALS: { type: MealType; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { type: 'breakfast', icon: 'sunny-outline' },
  { type: 'lunch', icon: 'restaurant-outline' },
  { type: 'dinner', icon: 'moon-outline' },
  { type: 'snack', icon: 'cafe-outline' },
];
const WATER_QUICK = [150, 250, 500];

export default function Nutrition() {
  const [date, setDate] = useState(toISODate());
  const { data: settings } = useSettings();
  const { data: entries = [] } = useNutritionEntries(date);
  const { data: water = [] } = useWater(date);
  const historyFrom = toISODate(addDays(parseISODate(date), -6));
  const { data: waterHistory = {} } = useWaterHistory(historyFrom, date);
  const addWater = useAddWater();
  const deleteWater = useDeleteWater();

  const [editing, setEditing] = useState<NutritionEntry | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [customWater, setCustomWater] = useState('');

  const total = useMemo(() => sumMacros(entries), [entries]);
  const calorieGoal = settings?.calorie_goal ?? null;
  const remaining = calorieGoal != null ? calorieGoal - total.kcal : null;
  const waterGoal = settings?.water_goal_ml ?? 2000;
  const waterTotal = water.reduce((n, w) => n + w.amount_ml, 0);
  const isToday = date === toISODate();

  const shift = (days: number) => setDate(toISODate(addDays(parseISODate(date), days)));

  const submitCustomWater = () => {
    const ml = parseNumber(customWater);
    if (ml == null || ml < 10 || ml > 5000) return;
    addWater.mutate({ amount: Math.round(ml), date });
    setCustomWater('');
  };

  const waterChart = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(parseISODate(historyFrom), i);
    return { label: WEEKDAYS_SHORT[(d.getDay() + 6) % 7], value: waterHistory[toISODate(d)] ?? 0 };
  });

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm }}>
        <T v="h1">Питание</T>
        <IconButton icon="options-outline" label="Цели питания" onPress={() => setGoalsOpen(true)} />
      </View>

      {/* Дата */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.lg, gap: space.md }}>
        <IconButton icon="chevron-back" label="Предыдущий день" onPress={() => shift(-1)} />
        <Pressable style={{ flex: 1, alignItems: 'center' }} onPress={() => setDate(toISODate())} accessibilityLabel="Вернуться к сегодняшнему дню">
          <T v="h3">{relativeDay(date)}</T>
          <T v="caption">{formatShortDate(date)}</T>
        </Pressable>
        <IconButton icon="chevron-forward" label="Следующий день" onPress={isToday ? undefined : () => shift(1)} color={isToday ? colors.muted : colors.text} />
      </View>

      {/* Калории */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.lg, gap: space.lg }}>
        <Ring size={124} stroke={11} value={calorieGoal ? total.kcal / calorieGoal : 0}>
          <T v="num" style={{ fontSize: 26 }}>
            {formatNumber(Math.max(0, Math.round(remaining ?? total.kcal)))}
          </T>
          <T v="caption" style={{ fontSize: 11 }}>
            {remaining == null ? 'ккал съедено' : remaining >= 0 ? 'ккал осталось' : 'цель достигнута'}
          </T>
        </Ring>
        <View style={{ flex: 1, gap: space.md }}>
          <Line label="Цель" value={calorieGoal != null ? `${formatNumber(calorieGoal)} ккал` : 'не задана'} />
          <Line label="Потреблено" value={`${formatNumber(Math.round(total.kcal))} ккал`} accent />
          <Line
            label={remaining != null && remaining < 0 ? 'Сверх цели' : 'Остаток'}
            value={remaining != null ? `${formatNumber(Math.abs(Math.round(remaining)))} ккал` : '—'}
            warn={remaining != null && remaining < 0}
          />
        </View>
      </Card>

      {/* БЖУ */}
      <Card style={{ marginTop: space.md, gap: space.lg }}>
        <Macro label="Белки" consumed={total.protein} goal={settings?.protein_goal_g ?? null} color={colors.pink} />
        <Macro label="Жиры" consumed={total.fat} goal={settings?.fat_goal_g ?? null} color="#F5A65B" />
        <Macro label="Углеводы" consumed={total.carbs} goal={settings?.carbs_goal_g ?? null} color="#6C8CFF" />
      </Card>

      {/* Приёмы пищи */}
      <SectionTitle title="Приёмы пищи" />
      {MEALS.map((meal) => {
        const list = entries.filter((e) => e.meal_type === meal.type);
        const kcal = Math.round(sumMacros(list).kcal);
        return (
          <Card key={meal.type} style={{ marginBottom: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={meal.icon} size={19} color={colors.pink} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="h3">{MEAL_LABELS[meal.type]}</T>
                <T v="caption">{list.length ? `${formatNumber(kcal)} ккал` : 'Пока ничего не добавлено'}</T>
              </View>
              <Tap
                label={`Добавить: ${MEAL_LABELS[meal.type]}`}
                onPress={() => router.push({ pathname: '/food/add', params: { meal: meal.type, date } })}
                style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.pink, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="add" size={22} color={colors.text} />
              </Tap>
            </View>
            {list.map((e) => (
              <Pressable key={e.id} onPress={() => setEditing(e)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingTop: space.md, marginTop: space.md, borderTopWidth: 1, borderTopColor: colors.border, opacity: pressed ? 0.6 : 1 })}>
                <View style={{ flex: 1 }}>
                  <T v="bodyM" numberOfLines={1}>
                    {e.product_name}
                  </T>
                  <T v="caption">{formatNumber(e.grams)} г</T>
                </View>
                <T v="bodyM">{formatNumber(Math.round(entryMacros(e).kcal))} ккал</T>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 6 }} />
              </Pressable>
            ))}
          </Card>
        );
      })}

      {/* Вода */}
      <SectionTitle title="Вода" />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <T v="num">
            {formatNumber(waterTotal)}
            <T v="caption"> из {formatNumber(waterGoal)} мл</T>
          </T>
          <T v="bodyM" color={waterTotal >= waterGoal ? colors.success : colors.text2}>
            {Math.min(999, Math.round((waterTotal / waterGoal) * 100))}%
          </T>
        </View>
        <View style={{ marginTop: space.md }}>
          <ProgressBar value={waterTotal / waterGoal} color="#4DA3FF" />
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
          {WATER_QUICK.map((ml) => (
            <Button key={ml} title={`+${ml}`} variant="secondary" small style={{ flex: 1 }} onPress={() => addWater.mutate({ amount: ml, date })} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md, alignItems: 'center' }}>
          <Input containerStyle={{ flex: 1, marginBottom: 0 }} placeholder="Другое количество" keyboardType="number-pad" suffix="мл" value={customWater} onChangeText={(t) => setCustomWater(t.replace(/\D/g, '').slice(0, 4))} onSubmitEditing={submitCustomWater} />
          <Button title="Добавить" small onPress={submitCustomWater} disabled={!customWater} style={{ height: 54, justifyContent: 'center' }} />
        </View>
        <ErrorText>{addWater.isError ? humanError(addWater.error) : null}</ErrorText>

        {water.length > 0 ? (
          <View style={{ marginTop: space.lg }}>
            <T v="caption" style={{ marginBottom: 4 }}>
              Записи за день
            </T>
            {water.map((w) => (
              <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', height: 38 }}>
                <Ionicons name="water" size={16} color="#4DA3FF" />
                <T v="body" style={{ flex: 1, marginLeft: 8 }}>
                  {w.amount_ml} мл
                </T>
                <T v="caption" style={{ marginRight: space.md }}>
                  {new Date(w.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </T>
                <Pressable hitSlop={10} onPress={() => deleteWater.mutate(w.id)} accessibilityLabel="Удалить запись воды">
                  <Ionicons name="close" size={18} color={colors.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <T v="caption" style={{ marginTop: space.lg }}>
          История за 7 дней, мл
        </T>
        <BarChart data={waterChart} height={130} emptyText="Записей воды за эти дни нет" highlightLast />
      </Card>

      <View style={{ marginTop: space.lg }}>
        <InfoBox>Калорийность и БЖУ — справочные усреднённые значения. Они не являются медицинскими данными или рекомендациями.</InfoBox>
      </View>

      <EditEntrySheet entry={editing} onClose={() => setEditing(null)} />
      <GoalsSheet visible={goalsOpen} onClose={() => setGoalsOpen(false)} />
    </Screen>
  );
}

function Line({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <View>
      <T v="caption" style={{ fontSize: 12 }}>
        {label}
      </T>
      <T v="bodyM" style={{ fontSize: 16 }} color={warn ? colors.error : accent ? colors.pinkLight : colors.text}>
        {value}
      </T>
    </View>
  );
}

function Macro({ label, consumed, goal, color }: { label: string; consumed: number; goal: number | null; color: string }) {
  const left = goal != null ? goal - consumed : null;
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <T v="bodyM">{label}</T>
        <T v="caption">
          <T v="bodyM" style={{ fontSize: 14 }}>
            {formatNumber(Math.round(consumed))}
          </T>
          {goal != null ? ` / ${goal} г` : ' г'}
          {left != null ? ` · ${left >= 0 ? 'осталось' : 'сверх'} ${formatNumber(Math.abs(Math.round(left)))} г` : ''}
        </T>
      </View>
      <ProgressBar value={goal ? consumed / goal : 0} color={color} height={7} />
    </View>
  );
}

function EditEntrySheet({ entry, onClose }: { entry: NutritionEntry | null; onClose: () => void }) {
  const update = useUpdateEntry();
  const remove = useDeleteEntry();
  const [grams, setGrams] = useState('');
  const [meal, setMeal] = useState<MealType>('breakfast');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (entry) {
      setGrams(String(entry.grams));
      setMeal(entry.meal_type);
      setError(null);
    }
  }, [entry]);

  if (!entry) return null;
  const g = parseNumber(grams);
  const preview = entryMacros({ ...entry, grams: g && g > 0 ? g : 0 });

  const save = () => {
    if (g == null || g <= 0 || g > 5000) return setError('Укажите количество от 1 до 5000 г');
    update.mutate({ id: entry.id, grams: g, meal }, { onSuccess: onClose, onError: (e) => setError(humanError(e)) });
  };

  return (
    <Sheet visible onClose={onClose} title={entry.product_name}>
      <Input label="Количество" keyboardType="decimal-pad" suffix="г" value={grams} onChangeText={setGrams} error={error ?? undefined} maxLength={6} />
      <T v="caption" style={{ marginBottom: space.lg }}>
        {formatNumber(Math.round(preview.kcal))} ккал · Б {formatNumber(preview.protein, 1)} · Ж {formatNumber(preview.fat, 1)} · У {formatNumber(preview.carbs, 1)}
      </T>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginBottom: space.xl }}>
        {MEALS.map((m) => (
          <Chip key={m.type} label={MEAL_LABELS[m.type]} active={meal === m.type} onPress={() => setMeal(m.type)} />
        ))}
      </View>
      <Button title="Сохранить" onPress={save} loading={update.isPending} />
      <Button
        title="Удалить запись"
        variant="danger"
        style={{ marginTop: space.md }}
        loading={remove.isPending}
        onPress={() => confirm('Удалить запись?', entry.product_name, () => remove.mutate(entry.id, { onSuccess: onClose }), 'Удалить', true)}
      />
    </Sheet>
  );
}

function GoalsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const [form, setForm] = useState({ kcal: '', protein: '', fat: '', carbs: '', water: '' });
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setForm({
        kcal: settings?.calorie_goal != null ? String(settings.calorie_goal) : '',
        protein: settings?.protein_goal_g != null ? String(settings.protein_goal_g) : '',
        fat: settings?.fat_goal_g != null ? String(settings.fat_goal_g) : '',
        carbs: settings?.carbs_goal_g != null ? String(settings.carbs_goal_g) : '',
        water: String(settings?.water_goal_ml ?? 2000),
      });
      setError(null);
    }
  }, [visible, settings]);

  const save = () => {
    const kcal = parseNumber(form.kcal);
    const protein = parseNumber(form.protein);
    const fat = parseNumber(form.fat);
    const carbs = parseNumber(form.carbs);
    const water = parseNumber(form.water);
    if (kcal == null || kcal < 800 || kcal > 10000) return setError('Калории: от 800 до 10 000');
    if ([protein, fat].some((v) => v == null || v < 0 || v > 1000)) return setError('Белки и жиры: от 0 до 1000 г');
    if (carbs == null || carbs < 0 || carbs > 2000) return setError('Углеводы: от 0 до 2000 г');
    if (water == null || water < 250 || water > 10000) return setError('Вода: от 250 до 10 000 мл');
    update.mutate(
      { calorie_goal: Math.round(kcal), protein_goal_g: Math.round(protein!), fat_goal_g: Math.round(fat!), carbs_goal_g: Math.round(carbs), water_goal_ml: Math.round(water) },
      { onSuccess: onClose, onError: (e) => setError(humanError(e)) },
    );
  };

  const field = (key: keyof typeof form, label: string, suffix: string, inRow = false) => (
    <Input containerStyle={inRow ? { flex: 1 } : undefined} label={label} suffix={suffix} keyboardType="number-pad" value={form[key]} onChangeText={(t) => setForm({ ...form, [key]: t.replace(/\D/g, '').slice(0, 5) })} />
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Цели на день">
      <T v="caption" style={{ marginBottom: space.lg }}>
        Начальные значения рассчитаны по анкете (формула Миффлина — Сан Жеора) и являются ориентировочными. Измените их под себя.
      </T>
      <ErrorText>{error}</ErrorText>
      {field('kcal', 'Калории', 'ккал')}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {field('protein', 'Белки', 'г', true)}
        {field('fat', 'Жиры', 'г', true)}
        {field('carbs', 'Углеводы', 'г', true)}
      </View>
      {field('water', 'Вода', 'мл')}
      <Button title="Сохранить" onPress={save} loading={update.isPending} style={{ marginTop: space.sm }} />
    </Sheet>
  );
}
