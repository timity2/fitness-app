import { ageFrom } from '@/lib/format';
import type { Gender, GoalType, NutritionEntry } from '@/types/db';

export interface NutritionTargets {
  calorie_goal: number;
  protein_goal_g: number;
  fat_goal_g: number;
  carbs_goal_g: number;
}

/**
 * Ориентировочная суточная норма по формуле Миффлина — Сан Жеора.
 * Это справочная оценка, а не медицинская рекомендация; пользователь может изменить цели вручную.
 */
export function estimateTargets(input: {
  weightKg: number;
  heightCm: number;
  birthDate: string | null;
  gender: Gender | null;
  workoutsPerWeek: number;
  goal: GoalType;
}): NutritionTargets {
  const age = ageFrom(input.birthDate) ?? 30;
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * age;
  // без указания пола берётся среднее между мужской (+5) и женской (−161) поправками
  const bmr = base + (input.gender === 'male' ? 5 : input.gender === 'female' ? -161 : -78);
  const activity = input.workoutsPerWeek <= 1 ? 1.3 : input.workoutsPerWeek <= 3 ? 1.45 : input.workoutsPerWeek <= 5 ? 1.6 : 1.75;
  const goalFactor = input.goal === 'weight_loss' ? 0.85 : input.goal === 'muscle_gain' ? 1.1 : 1;
  const calories = Math.max(1200, Math.round((bmr * activity * goalFactor) / 10) * 10);
  const proteinPerKg = input.goal === 'muscle_gain' || input.goal === 'strength' ? 1.8 : input.goal === 'weight_loss' ? 1.7 : 1.4;
  const protein = Math.round(input.weightKg * proteinPerKg);
  const fat = Math.round(input.weightKg * 0.9);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calorie_goal: calories, protein_goal_g: protein, fat_goal_g: fat, carbs_goal_g: carbs };
}

export interface Macros {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

/** Пищевая ценность записи с учётом количества продукта */
export const entryMacros = (e: Pick<NutritionEntry, 'grams' | 'kcal_100' | 'protein_100' | 'fat_100' | 'carbs_100'>): Macros => {
  const k = e.grams / 100;
  return { kcal: e.kcal_100 * k, protein: e.protein_100 * k, fat: e.fat_100 * k, carbs: e.carbs_100 * k };
};

export const sumMacros = (entries: NutritionEntry[]): Macros =>
  entries.reduce<Macros>(
    (acc, e) => {
      const m = entryMacros(e);
      return { kcal: acc.kcal + m.kcal, protein: acc.protein + m.protein, fat: acc.fat + m.fat, carbs: acc.carbs + m.carbs };
    },
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );

/** Доля пути к целевому весу: 0…1 */
export function weightProgress(start: number | null, current: number | null, target: number | null): number | null {
  if (start == null || current == null || target == null || start === target) return null;
  const done = (start - current) / (start - target);
  return Math.max(0, Math.min(1, done));
}
