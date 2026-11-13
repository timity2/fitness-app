// Измерения тела: запись с датой и история изменений
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useSettings } from '@/api/profile';
import { useAddMeasurement, useDeleteMeasurement, useMeasurements, type MeasurementInput } from '@/api/progress';
import { LineChart } from '@/components/Charts';
import { Button, Card, Chip, confirm, EmptyState, ErrorState, ErrorText, Header, IconButton, Input, Loading, Screen, SectionTitle, Sheet, T } from '@/components/ui';
import { formatDate, formatShortDate, parseNumber, toISODate, units } from '@/lib/format';
import { humanError } from '@/lib/supabase';
import { maskRuDate, parseRuDate, toRuDate } from '@/lib/validation';
import { colors, space } from '@/theme';
import type { Measurement } from '@/types/db';

type MetricKey = 'weight_kg' | 'chest_cm' | 'waist_cm' | 'hips_cm' | 'arm_cm' | 'leg_cm';
const METRICS: { key: MetricKey; label: string; isWeight?: boolean }[] = [
  { key: 'weight_kg', label: 'Вес', isWeight: true },
  { key: 'chest_cm', label: 'Грудь' },
  { key: 'waist_cm', label: 'Талия' },
  { key: 'hips_cm', label: 'Бёдра' },
  { key: 'arm_cm', label: 'Рука' },
  { key: 'leg_cm', label: 'Нога' },
];

export default function Measurements() {
  const list = useMeasurements();
  const remove = useDeleteMeasurement();
  const { data: settings } = useSettings();
  const u = units(settings?.unit_system ?? 'metric');
  const [metric, setMetric] = useState<MetricKey>('weight_kg');
  const [adding, setAdding] = useState(false);

  const show = (m: Measurement, key: MetricKey) => (key === 'weight_kg' ? u.weight(m[key]) : u.length(m[key]));
  const rows = list.data ?? [];
  const chart = rows
    .filter((m) => m[metric] != null)
    .reverse()
    .map((m) => ({ label: formatShortDate(m.measured_on), value: metric === 'weight_kg' ? u.toWeight(m[metric]!) : u.toLength(m[metric]!) }));

  return (
    <Screen header={<Header title="Измерения тела" right={<IconButton icon="add" label="Добавить измерение" onPress={() => setAdding(true)} />} />}>
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon="body-outline" title="Измерений пока нет" text="Записывайте вес и объёмы, чтобы видеть изменения во времени." action="Добавить измерение" onAction={() => setAdding(true)} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            {METRICS.map((m) => (
              <Chip key={m.key} label={m.label} active={metric === m.key} onPress={() => setMetric(m.key)} />
            ))}
          </View>
          <Card style={{ marginTop: space.md, paddingHorizontal: space.md }}>
            <T v="caption" style={{ marginLeft: 4, marginBottom: space.sm }}>
              {METRICS.find((m) => m.key === metric)!.label}, {metric === 'weight_kg' ? u.weightUnit : u.lengthUnit}
            </T>
            <LineChart data={chart} emptyText="По этому показателю записей нет" />
          </Card>

          <SectionTitle title="История" />
          {rows.map((m) => (
            <Card key={m.id} style={{ marginBottom: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <T v="bodyM" style={{ flex: 1 }}>
                  {formatDate(m.measured_on)}
                </T>
                <Pressable hitSlop={10} accessibilityLabel="Удалить запись" onPress={() => confirm('Удалить измерение?', formatDate(m.measured_on), () => remove.mutate(m.id), 'Удалить', true)}>
                  <Ionicons name="trash-outline" size={18} color={colors.muted} />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm }}>
                {METRICS.filter((x) => m[x.key] != null).map((x) => (
                  <View key={x.key} style={{ width: '33.3%', paddingVertical: 4 }}>
                    <T v="caption" style={{ fontSize: 12 }}>
                      {x.label}
                    </T>
                    <T v="bodyM">{show(m, x.key)}</T>
                  </View>
                ))}
              </View>
            </Card>
          ))}
          <Button title="Добавить измерение" icon="add" onPress={() => setAdding(true)} style={{ marginTop: space.sm }} />
        </>
      )}
      <AddSheet visible={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

function AddSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const add = useAddMeasurement();
  const { data: settings } = useSettings();
  const u = units(settings?.unit_system ?? 'metric');
  const [date, setDate] = useState(toRuDate(toISODate()));
  const [values, setValues] = useState<Record<MetricKey, string>>({ weight_kg: '', chest_cm: '', waist_cm: '', hips_cm: '', arm_cm: '', leg_cm: '' });
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setDate(toRuDate(toISODate()));
      setValues({ weight_kg: '', chest_cm: '', waist_cm: '', hips_cm: '', arm_cm: '', leg_cm: '' });
      setError(null);
    }
  }, [visible]);

  const save = () => {
    const iso = parseRuDate(date);
    if (!iso || iso > toISODate()) return setError('Укажите дату не позже сегодняшней в формате ДД.ММ.ГГГГ');
    const input: MeasurementInput = { measured_on: iso, weight_kg: null, chest_cm: null, waist_cm: null, hips_cm: null, arm_cm: null, leg_cm: null };
    for (const m of METRICS) {
      const raw = values[m.key].trim();
      if (!raw) continue;
      const n = parseNumber(raw);
      const metric = n == null ? null : m.isWeight ? u.fromWeight(n) : u.fromLength(n);
      const [min, max] = m.isWeight ? [20, 400] : [10, 300];
      if (metric == null || metric < min || metric > max) return setError(`Проверьте значение: ${m.label.toLowerCase()}`);
      input[m.key] = metric;
    }
    if (METRICS.every((m) => input[m.key] == null)) return setError('Заполните хотя бы один показатель');
    add.mutate(input, { onSuccess: onClose, onError: (e) => setError(humanError(e)) });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Новое измерение">
      <ErrorText>{error}</ErrorText>
      <Input label="Дата" placeholder="ДД.ММ.ГГГГ" keyboardType="number-pad" value={date} onChangeText={(t) => setDate(maskRuDate(t))} maxLength={10} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
        {METRICS.map((m) => (
          <View key={m.key} style={{ width: '50%', paddingHorizontal: 4 }}>
            <Input
              label={m.label}
              suffix={m.isWeight ? u.weightUnit : u.lengthUnit}
              keyboardType="decimal-pad"
              value={values[m.key]}
              onChangeText={(t) => setValues({ ...values, [m.key]: t })}
              maxLength={6}
            />
          </View>
        ))}
      </View>
      <T v="caption" style={{ marginBottom: space.lg }}>
        Заполняйте только те показатели, которые измерили.
      </T>
      <Button title="Сохранить" onPress={save} loading={add.isPending} />
    </Sheet>
  );
}
