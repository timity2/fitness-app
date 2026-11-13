// Добавление еды: поиск по базе, избранное, свои продукты, выбор количества и приёма пищи.
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';

import { useAddEntry, useCreateProduct, useDeleteProduct, useFavoriteIds, useFavoriteProducts, useFoodSearch, useToggleFavorite } from '@/api/nutrition';
import { Field } from '@/components/Field';
import { Button, Card, Chip, confirm, EmptyState, ErrorState, ErrorText, Header, IconButton, Input, Loading, Screen, Segmented, Sheet, T } from '@/components/ui';
import { formatNumber, MEAL_LABELS, parseNumber, relativeDay, toISODate } from '@/lib/format';
import { humanError } from '@/lib/supabase';
import { numberField } from '@/lib/validation';
import { useUid } from '@/store/auth';
import { colors, space } from '@/theme';
import type { FoodProduct, MealType } from '@/types/db';

type Tab = 'all' | 'favorites' | 'mine';
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function useDebounced<V>(value: V, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function AddFood() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const initialMeal = MEAL_TYPES.includes(params.meal as MealType) ? (params.meal as MealType) : 'snack';
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : toISODate();
  const uid = useUid();

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FoodProduct | null>(null);
  const [creating, setCreating] = useState(false);

  const foods = useFoodSearch(useDebounced(search));
  const { data: favoriteIds = [] } = useFavoriteIds();
  const favorites = useFavoriteProducts(favoriteIds);
  const toggleFavorite = useToggleFavorite();

  const term = search.trim().toLowerCase();
  const list =
    tab === 'favorites'
      ? (favoriteIds.length ? favorites.data ?? [] : []).filter((p) => !term || p.name.toLowerCase().includes(term))
      : (foods.data ?? []).filter((p) => tab === 'all' || p.owner_id === uid);
  const loading = tab === 'favorites' ? favoriteIds.length > 0 && favorites.isPending : foods.isPending;

  return (
    <Screen header={<Header title={`${MEAL_LABELS[initialMeal]} · ${relativeDay(date).toLowerCase()}`} right={<IconButton icon="add" label="Создать свой продукт" onPress={() => setCreating(true)} />} />}>
      <Input placeholder="Поиск продукта" value={search} onChangeText={setSearch} autoCorrect={false} returnKeyType="search" />
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: 'Все' },
          { value: 'favorites', label: 'Избранное' },
          { value: 'mine', label: 'Мои' },
        ]}
      />

      <View style={{ marginTop: space.lg }}>
        {loading ? (
          <Loading />
        ) : foods.isError && tab !== 'favorites' ? (
          <ErrorState onRetry={() => foods.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={tab === 'favorites' ? 'star-outline' : 'search-outline'}
            title={tab === 'favorites' ? 'В избранном пусто' : tab === 'mine' ? 'Своих продуктов пока нет' : 'Ничего не найдено'}
            text={tab === 'favorites' ? 'Отмечайте продукты звёздочкой, чтобы быстро добавлять их.' : 'Вы можете добавить собственный продукт с пищевой ценностью.'}
            action={tab === 'favorites' ? undefined : 'Создать продукт'}
            onAction={() => setCreating(true)}
          />
        ) : (
          list.map((p) => {
            const favorite = favoriteIds.includes(p.id);
            return (
              <Card key={p.id} onPress={() => setSelected(p)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, marginBottom: space.sm }}>
                <View style={{ flex: 1 }}>
                  <T v="bodyM" numberOfLines={2}>
                    {p.name}
                  </T>
                  <T v="caption">
                    {formatNumber(p.kcal_100)} ккал · Б {formatNumber(p.protein_100, 1)} · Ж {formatNumber(p.fat_100, 1)} · У {formatNumber(p.carbs_100, 1)} на 100 г
                    {p.owner_id ? ' · свой' : ''}
                  </T>
                </View>
                <Pressable hitSlop={10} onPress={() => toggleFavorite.mutate({ productId: p.id, favorite: !favorite })} accessibilityLabel={favorite ? 'Убрать из избранного' : 'В избранное'}>
                  <Ionicons name={favorite ? 'star' : 'star-outline'} size={22} color={favorite ? colors.pink : colors.muted} />
                </Pressable>
              </Card>
            );
          })
        )}
      </View>

      <AmountSheet product={selected} meal={initialMeal} date={date} onClose={() => setSelected(null)} isOwn={!!selected && selected.owner_id === uid} />
      <CreateProductSheet
        visible={creating}
        initialName={search.trim()}
        onClose={() => setCreating(false)}
        onCreated={(p) => {
          setCreating(false);
          setTab('mine');
          setSelected(p);
        }}
      />
    </Screen>
  );
}

function AmountSheet({ product, meal: initialMeal, date, onClose, isOwn }: { product: FoodProduct | null; meal: MealType; date: string; onClose: () => void; isOwn: boolean }) {
  const add = useAddEntry();
  const remove = useDeleteProduct();
  const [grams, setGrams] = useState('');
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setGrams(String(product.serving_g));
      setMeal(initialMeal);
      setError(null);
    }
  }, [product, initialMeal]);

  if (!product) return null;
  const g = parseNumber(grams);
  const k = (g && g > 0 ? g : 0) / 100;

  const save = () => {
    if (g == null || g <= 0 || g > 5000) return setError('Укажите количество от 1 до 5000 г');
    add.mutate({ product, grams: g, meal, date }, { onSuccess: () => router.back(), onError: (e) => setError(humanError(e)) });
  };

  return (
    <Sheet visible onClose={onClose} title={product.name}>
      <Input label="Количество" keyboardType="decimal-pad" suffix="г" value={grams} onChangeText={setGrams} error={error ?? undefined} maxLength={6} />
      <T v="caption" style={{ marginBottom: 8 }}>
        Порция — {formatNumber(product.serving_g)} г
      </T>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginBottom: space.lg }}>
        {[0.5, 1, 1.5, 2].map((n) => (
          <Chip key={n} label={`${String(n).replace('.', ',')} порц.`} active={g === Math.round(product.serving_g * n * 10) / 10} onPress={() => setGrams(String(Math.round(product.serving_g * n * 10) / 10))} />
        ))}
        <Chip label="100 г" active={g === 100} onPress={() => setGrams('100')} />
      </View>
      <Card style={{ flexDirection: 'row', marginBottom: space.lg, backgroundColor: colors.card }}>
        <Cell value={formatNumber(Math.round(product.kcal_100 * k))} label="ккал" accent />
        <Cell value={formatNumber(product.protein_100 * k, 1)} label="белки" />
        <Cell value={formatNumber(product.fat_100 * k, 1)} label="жиры" />
        <Cell value={formatNumber(product.carbs_100 * k, 1)} label="углеводы" />
      </Card>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginBottom: space.xl }}>
        {MEAL_TYPES.map((m) => (
          <Chip key={m} label={MEAL_LABELS[m]} active={meal === m} onPress={() => setMeal(m)} />
        ))}
      </View>
      <Button title="Добавить в дневник" onPress={save} loading={add.isPending} />
      {isOwn ? (
        <Button
          title="Удалить свой продукт"
          variant="danger"
          style={{ marginTop: space.md }}
          onPress={() => confirm('Удалить продукт?', 'Записи дневника с этим продуктом сохранятся.', () => remove.mutate(product.id, { onSuccess: onClose }), 'Удалить', true)}
        />
      ) : null}
    </Sheet>
  );
}

function Cell({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <T v="num" style={{ fontSize: 18 }} color={accent ? colors.pinkLight : colors.text}>
        {value}
      </T>
      <T v="caption" style={{ fontSize: 11 }}>
        {label}
      </T>
    </View>
  );
}

const productSchema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(120, 'Не более 120 символов'),
  kcal: numberField(0, 950, 'От 0 до 950 ккал'),
  protein: numberField(0, 100, 'От 0 до 100 г', true),
  fat: numberField(0, 100, 'От 0 до 100 г', true),
  carbs: numberField(0, 100, 'От 0 до 100 г', true),
  serving: numberField(1, 5000, 'От 1 до 5000 г'),
});
type ProductForm = z.infer<typeof productSchema>;

function CreateProductSheet({ visible, initialName, onClose, onCreated }: { visible: boolean; initialName: string; onClose: () => void; onCreated: (p: FoodProduct) => void }) {
  const create = useCreateProduct();
  const { control, handleSubmit, reset } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', kcal: '', protein: '', fat: '', carbs: '', serving: '100' },
  });

  useEffect(() => {
    if (visible) reset({ name: initialName, kcal: '', protein: '', fat: '', carbs: '', serving: '100' });
  }, [visible, initialName, reset]);

  const onSubmit = handleSubmit((v) =>
    create.mutate(
      {
        name: v.name.trim(),
        kcal_100: parseNumber(v.kcal) ?? 0,
        protein_100: parseNumber(v.protein) ?? 0,
        fat_100: parseNumber(v.fat) ?? 0,
        carbs_100: parseNumber(v.carbs) ?? 0,
        serving_g: parseNumber(v.serving) ?? 100,
      },
      { onSuccess: onCreated },
    ),
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Свой продукт">
      <T v="caption" style={{ marginBottom: space.lg }}>
        Пищевая ценность указывается на 100 г. Продукт будет виден только вам.
      </T>
      <ErrorText>{create.isError ? humanError(create.error) : null}</ErrorText>
      <Field control={control} name="name" label="Название" placeholder="Например: гранола домашняя" />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Field control={control} name="kcal" label="Калории" suffix="ккал" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field control={control} name="serving" label="Порция" suffix="г" keyboardType="decimal-pad" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Field control={control} name="protein" label="Белки" suffix="г" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field control={control} name="fat" label="Жиры" suffix="г" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field control={control} name="carbs" label="Углеводы" suffix="г" keyboardType="decimal-pad" />
        </View>
      </View>
      <Button title="Сохранить продукт" onPress={onSubmit} loading={create.isPending} style={{ marginTop: space.sm }} />
    </Sheet>
  );
}
