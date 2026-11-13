// Раздел «Тренировки»: библиотека программ и упражнений с поиском, категориями и фильтрами.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useCategories, useExercises, usePrograms, useProgramExerciseCounts, useUserPrograms } from '@/api/workouts';
import { Cover } from '@/components/Cover';
import { ProgramCard, Tag } from '@/components/ProgramCard';
import { Button, Card, Chip, EmptyState, ErrorState, Input, Loading, Screen, Segmented, Sheet, T, Tap } from '@/components/ui';
import { EQUIPMENT_LABELS, GOAL_LABELS, LEVEL_SHORT, LOCATION_LABELS, TYPE_LABELS } from '@/lib/format';
import { colors, space } from '@/theme';
import type { Equipment, FitnessLevel, GoalType, WorkoutLocation, WorkoutType } from '@/types/db';

type Tab = 'programs' | 'exercises' | 'mine';
type DurationFilter = 'short' | 'medium' | 'long';

interface Filters {
  goal: GoalType | null;
  level: FitnessLevel | null;
  duration: DurationFilter | null;
  type: WorkoutType | null;
  location: WorkoutLocation | null;
  equipment: Equipment | null;
}

const NO_FILTERS: Filters = { goal: null, level: null, duration: null, type: null, location: null, equipment: null };
const DURATIONS: Record<DurationFilter, { label: string; test: (m: number) => boolean }> = {
  short: { label: 'до 20 мин', test: (m) => m <= 20 },
  medium: { label: '20–45 мин', test: (m) => m > 20 && m <= 45 },
  long: { label: 'более 45 мин', test: (m) => m > 45 },
};

export default function Workouts() {
  const categories = useCategories();
  const programs = usePrograms();
  const exercises = useExercises();
  const { data: counts = {} } = useProgramExerciseCounts();
  const { data: userPrograms = [] } = useUserPrograms();

  const [tab, setTab] = useState<Tab>('programs');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sheet, setSheet] = useState(false);

  const mineIds = useMemo(() => new Set(userPrograms.map((u) => u.program_id)), [userPrograms]);
  const exerciseById = useMemo(() => new Map((exercises.data ?? []).map((e) => [e.id, e])), [exercises.data]);
  const term = search.trim().toLowerCase();
  const activeFilters = Object.values(filters).filter(Boolean).length;

  const programList = useMemo(() => {
    return (programs.data ?? []).filter((p) => {
      if (tab === 'mine' && !mineIds.has(p.id) && !p.owner_id) return false;
      if (term && !`${p.name} ${p.description} ${p.target_muscles.join(' ')}`.toLowerCase().includes(term)) return false;
      if (category && p.category_id !== category) return false;
      if (filters.goal && p.goal_type !== filters.goal) return false;
      if (filters.level && p.difficulty !== filters.level) return false;
      if (filters.duration && !DURATIONS[filters.duration].test(p.duration_min)) return false;
      if (filters.type && p.workout_type !== filters.type) return false;
      if (filters.location && p.location !== filters.location) return false;
      if (filters.equipment) {
        const used = (counts[p.id]?.exerciseIds ?? []).map((id) => exerciseById.get(id)?.equipment);
        const ok = filters.equipment === 'none' ? used.length > 0 && used.every((e) => e === 'none') : used.includes(filters.equipment);
        if (!ok) return false;
      }
      return true;
    });
  }, [programs.data, tab, mineIds, term, category, filters, counts, exerciseById]);

  const exerciseList = useMemo(() => {
    return (exercises.data ?? []).filter((e) => {
      if (term && !`${e.name} ${e.primary_muscles.join(' ')}`.toLowerCase().includes(term)) return false;
      if (category && e.category_id !== category) return false;
      if (filters.level && e.difficulty !== filters.level) return false;
      if (filters.equipment && e.equipment !== filters.equipment) return false;
      if (filters.location === 'home' && !['none', 'dumbbells', 'bands', 'kettlebell'].includes(e.equipment)) return false;
      return true;
    });
  }, [exercises.data, term, category, filters]);

  const loading = programs.isPending || exercises.isPending || categories.isPending;
  const failed = programs.isError || exercises.isError;

  return (
    <Screen>
      <T v="h1" style={{ marginTop: space.sm }}>
        Тренировки
      </T>

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.lg }}>
        <Input
          containerStyle={{ flex: 1, marginBottom: 0 }}
          placeholder="Поиск тренировок и упражнений"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          returnKeyType="search"
        />
        <Tap onPress={() => setSheet(true)} label="Фильтры" style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: activeFilters ? colors.pinkSoft : colors.card, borderWidth: 1, borderColor: activeFilters ? colors.pink : colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="options-outline" size={22} color={activeFilters ? colors.pink : colors.text} />
          {activeFilters ? (
            <View style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.pink, alignItems: 'center', justifyContent: 'center' }}>
              <T v="small" color={colors.text}>
                {activeFilters}
              </T>
            </View>
          ) : null}
        </Tap>
      </View>

      <View style={{ marginTop: space.lg }}>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'programs', label: 'Программы' },
            { value: 'exercises', label: 'Упражнения' },
            { value: 'mine', label: `Мои${mineIds.size ? ` · ${mineIds.size}` : ''}` },
          ]}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl, marginTop: space.lg }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.sm }}>
        <Chip label="Все" active={!category} onPress={() => setCategory(null)} />
        {(categories.data ?? []).map((c) => (
          <Chip key={c.id} label={c.name} active={category === c.id} onPress={() => setCategory(category === c.id ? null : c.id)} />
        ))}
      </ScrollView>

      <View style={{ marginTop: space.lg }}>
        {loading ? (
          <Loading />
        ) : failed ? (
          <ErrorState
            onRetry={() => {
              programs.refetch();
              exercises.refetch();
            }}
          />
        ) : tab === 'exercises' ? (
          exerciseList.length === 0 ? (
            <EmptyState icon="search-outline" title="Ничего не найдено" text="Попробуйте изменить запрос или сбросить фильтры." action={activeFilters ? 'Сбросить фильтры' : undefined} onAction={() => setFilters(NO_FILTERS)} />
          ) : (
            exerciseList.map((e) => (
              <Card key={e.id} onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: e.id } })} style={{ flexDirection: 'row', gap: space.md, padding: space.md, marginBottom: space.md, alignItems: 'center' }}>
                <Cover imageUrl={e.image_url} categoryId={e.category_id} style={{ width: 64, height: 64 }} iconSize={28} rounded={12} />
                <View style={{ flex: 1 }}>
                  <T v="bodyM" numberOfLines={1}>
                    {e.name}
                  </T>
                  <T v="caption" numberOfLines={1}>
                    {e.primary_muscles.join(', ')}
                  </T>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                    <Tag label={LEVEL_SHORT[e.difficulty]} accent />
                    <Tag label={EQUIPMENT_LABELS[e.equipment]} />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Card>
            ))
          )
        ) : programList.length === 0 ? (
          tab === 'mine' && !term && !category && !activeFilters ? (
            <EmptyState icon="bookmark-outline" title="Пока нет своих тренировок" text="Откройте программу из каталога и добавьте её в «Мои», чтобы она всегда была под рукой." action="Открыть каталог" onAction={() => setTab('programs')} />
          ) : (
            <EmptyState icon="search-outline" title="Ничего не найдено" text="Попробуйте изменить запрос или сбросить фильтры." action={activeFilters ? 'Сбросить фильтры' : undefined} onAction={() => setFilters(NO_FILTERS)} />
          )
        ) : (
          programList.map((p) => <ProgramCard key={p.id} program={p} exercises={counts[p.id]?.exercises} mine={tab !== 'mine' && mineIds.has(p.id)} note={p.target_muscles.join(', ')} />)
        )}
      </View>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Фильтры">
        <FilterGroup title="Цель" options={GOAL_LABELS} value={filters.goal} onChange={(goal) => setFilters({ ...filters, goal })} />
        <FilterGroup title="Уровень сложности" options={LEVEL_SHORT} value={filters.level} onChange={(level) => setFilters({ ...filters, level })} />
        <FilterGroup
          title="Продолжительность"
          options={{ short: DURATIONS.short.label, medium: DURATIONS.medium.label, long: DURATIONS.long.label }}
          value={filters.duration}
          onChange={(duration) => setFilters({ ...filters, duration })}
        />
        <FilterGroup title="Тип тренировки" options={TYPE_LABELS as Record<WorkoutType, string>} value={filters.type} onChange={(type) => setFilters({ ...filters, type })} />
        <FilterGroup title="Место" options={LOCATION_LABELS as Record<WorkoutLocation, string>} value={filters.location} onChange={(location) => setFilters({ ...filters, location })} />
        <FilterGroup title="Оборудование" options={EQUIPMENT_LABELS as Record<Equipment, string>} value={filters.equipment} onChange={(equipment) => setFilters({ ...filters, equipment })} />
        <T v="caption" style={{ marginBottom: space.lg }}>
          Группа мышц выбирается чипами категорий над списком.
        </T>
        <View style={{ flexDirection: 'row', gap: space.md, marginBottom: space.sm }}>
          <Button title="Сбросить" variant="secondary" onPress={() => setFilters(NO_FILTERS)} style={{ flex: 1 }} />
          <Button title="Показать" onPress={() => setSheet(false)} style={{ flex: 1 }} />
        </View>
      </Sheet>
    </Screen>
  );
}

function FilterGroup<V extends string>({ title, options, value, onChange }: { title: string; options: Record<V, string>; value: V | null; onChange: (v: V | null) => void }) {
  return (
    <View style={{ marginBottom: space.xl }}>
      <T v="bodyM" style={{ marginBottom: space.md }}>
        {title}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {(Object.keys(options) as V[]).map((key) => (
          <Chip key={key} label={options[key]} active={value === key} onPress={() => onChange(value === key ? null : key)} />
        ))}
      </View>
    </View>
  );
}
