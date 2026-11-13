import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase, unwrap } from '@/lib/supabase';
import { requireUid, useUid } from '@/store/auth';
import type { FoodProduct, MealType, NutritionEntry, WaterEntry } from '@/types/db';

// ---------- Продукты ----------
/**
 * Поиск по базе продуктов. Источник — таблица food_products (общий каталог + свои продукты).
 * Внешнюю базу можно подключить, импортируя продукты в эту же таблицу
 * (поля external_source / external_id) — экран поиска менять не потребуется.
 */
export function useFoodSearch(term: string) {
  const uid = useUid();
  const q = term.trim();
  return useQuery({
    queryKey: ['foods', uid, q],
    staleTime: 60_000,
    queryFn: () => {
      let query = supabase.from('food_products').select('*');
      if (q) query = query.ilike('name', `%${q.replace(/[%_]/g, '')}%`);
      return unwrap<FoodProduct[]>(query.order('name').limit(60));
    },
  });
}

export function useFavoriteIds() {
  const uid = useUid();
  return useQuery({
    queryKey: ['food-favorites', uid],
    enabled: !!uid,
    queryFn: async () => {
      const rows = await unwrap<{ product_id: string }[]>(
        supabase.from('food_favorites').select('*').eq('user_id', uid!),
      );
      return rows.map((r) => r.product_id);
    },
  });
}

export function useFavoriteProducts(ids: string[] | undefined) {
  return useQuery({
    queryKey: ['food-favorite-products', ids],
    enabled: !!ids && ids.length > 0,
    queryFn: () => unwrap<FoodProduct[]>(supabase.from('food_products').select('*').in('id', ids!).order('name')),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, favorite }: { productId: string; favorite: boolean }) => {
      const uid = requireUid();
      if (favorite) {
        await unwrap(
          supabase.from('food_favorites').upsert({ user_id: uid, product_id: productId }, { onConflict: 'user_id,product_id' }),
        );
      } else {
        await unwrap(supabase.from('food_favorites').delete().eq('user_id', uid).eq('product_id', productId));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food-favorites'] }),
  });
}

export type CustomProductInput = Pick<FoodProduct, 'name' | 'kcal_100' | 'protein_100' | 'fat_100' | 'carbs_100' | 'serving_g'>;

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomProductInput) =>
      unwrap<FoodProduct>(
        supabase.from('food_products').insert({ owner_id: requireUid(), category: 'custom', ...input }).select('*').single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['foods'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(supabase.from('food_products').delete().eq('id', id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['foods'] });
      qc.invalidateQueries({ queryKey: ['food-favorites'] });
    },
  });
}

// ---------- Дневник ----------
export function useNutritionEntries(date: string) {
  const uid = useUid();
  return useQuery({
    queryKey: ['nutrition', uid, date],
    enabled: !!uid,
    queryFn: () =>
      unwrap<NutritionEntry[]>(
        supabase.from('nutrition_entries').select('*').eq('user_id', uid!).eq('entry_date', date).order('created_at'),
      ),
  });
}

export function useAddEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ product, grams, meal, date }: { product: FoodProduct; grams: number; meal: MealType; date: string }) =>
      unwrap<NutritionEntry>(
        supabase
          .from('nutrition_entries')
          .insert({
            user_id: requireUid(),
            product_id: product.id,
            product_name: product.name,
            entry_date: date,
            meal_type: meal,
            grams,
            kcal_100: product.kcal_100,
            protein_100: product.protein_100,
            fat_100: product.fat_100,
            carbs_100: product.carbs_100,
          })
          .select('*')
          .single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition'] }),
  });
}

export function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, grams, meal }: { id: string; grams: number; meal: MealType }) =>
      unwrap(supabase.from('nutrition_entries').update({ grams, meal_type: meal }).eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition'] }),
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(supabase.from('nutrition_entries').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition'] }),
  });
}

// ---------- Вода ----------
export function useWater(date: string) {
  const uid = useUid();
  return useQuery({
    queryKey: ['water', uid, date],
    enabled: !!uid,
    queryFn: () =>
      unwrap<WaterEntry[]>(
        supabase.from('water_entries').select('*').eq('user_id', uid!).eq('entry_date', date).order('created_at', { ascending: false }),
      ),
  });
}

/** История воды: суммы по дням за период */
export function useWaterHistory(from: string, to: string) {
  const uid = useUid();
  return useQuery({
    queryKey: ['water', uid, 'history', from, to],
    enabled: !!uid,
    queryFn: async () => {
      const rows = await unwrap<WaterEntry[]>(
        supabase.from('water_entries').select('*').eq('user_id', uid!).gte('entry_date', from).lte('entry_date', to),
      );
      const byDay: Record<string, number> = {};
      for (const r of rows) byDay[r.entry_date] = (byDay[r.entry_date] ?? 0) + r.amount_ml;
      return byDay;
    },
  });
}

export function useAddWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ amount, date }: { amount: number; date: string }) =>
      unwrap(supabase.from('water_entries').insert({ user_id: requireUid(), entry_date: date, amount_ml: amount })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['water'] }),
  });
}

export function useDeleteWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(supabase.from('water_entries').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['water'] }),
  });
}
