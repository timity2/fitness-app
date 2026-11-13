// Сборка демо-данных: node scripts/build-seed.mjs
// Результат: supabase/seed.sql и mobile/src/demo/seedData.json (одни и те же id).
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { achievements, appSettings, categories, exercises, foods, programs } from './seed-source.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Детерминированный UUID из строки — повторный запуск seed не создаёт дубликатов
const uid = (key) => {
  const h = createHash('sha1').update(`pulse:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const now = '2026-01-01T00:00:00.000Z';

const data = {
  exercise_categories: categories.map(([slug, name], i) => ({
    id: uid(`cat:${slug}`), slug, name, sort_order: i + 1, is_demo: true, created_at: now,
  })),
  exercises: exercises.map((e) => ({
    id: uid(`ex:${e.slug}`),
    category_id: uid(`cat:${e.category}`),
    name: e.name,
    description: e.description,
    technique: e.technique,
    primary_muscles: e.muscles,
    equipment: e.equipment,
    difficulty: e.difficulty,
    default_sets: e.sets,
    default_reps: e.reps,
    default_rest_sec: e.rest,
    tips: e.tips,
    mistakes: e.mistakes,
    image_url: null,
    video_url: null,
    is_demo: true,
    is_published: true,
    created_at: now,
    updated_at: now,
  })),
  workout_programs: programs.map((p) => ({
    id: uid(`prog:${p.slug}`),
    owner_id: null,
    category_id: uid(`cat:${p.category}`),
    name: p.name,
    description: p.description,
    goal_type: p.goal,
    difficulty: p.difficulty,
    duration_min: p.minutes,
    location: p.location,
    workout_type: p.type,
    target_muscles: p.muscles,
    image_url: null,
    is_demo: true,
    is_published: true,
    created_at: now,
    updated_at: now,
  })),
  workout_exercises: programs.flatMap((p) =>
    p.items.map(([slug, sets, reps, rest], i) => {
      if (!exercises.some((e) => e.slug === slug)) throw new Error(`Unknown exercise ${slug} in ${p.slug}`);
      return {
        id: uid(`pe:${p.slug}:${i}`),
        program_id: uid(`prog:${p.slug}`),
        exercise_id: uid(`ex:${slug}`),
        position: i,
        sets,
        reps,
        rest_sec: rest,
      };
    }),
  ),
  food_products: foods.map((f) => ({
    id: uid(`food:${f.name}`),
    owner_id: null,
    name: f.name,
    category: f.category,
    kcal_100: f.kcal,
    protein_100: f.protein,
    fat_100: f.fat,
    carbs_100: f.carbs,
    serving_g: f.serving,
    image_url: null,
    external_source: null,
    external_id: null,
    is_demo: true,
    is_published: true,
    created_at: now,
    updated_at: now,
  })),
  achievements: achievements.map((a, i) => ({ id: uid(`ach:${a.code}`), ...a, sort_order: i + 1, is_demo: true })),
  app_settings: appSettings.map(([key, value, is_public]) => ({ key, value, is_public, updated_at: now })),
};

// ---- SQL ----
const lit = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return v.length ? `array[${v.map(lit).join(', ')}]::text[]` : `'{}'::text[]`;
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const insert = (table, rows, conflict, skip = []) => {
  const cols = Object.keys(rows[0]).filter((c) => !skip.includes(c));
  const values = rows.map((r) => `  (${cols.map((c) => lit(r[c])).join(', ')})`).join(',\n');
  const updates = cols.filter((c) => c !== conflict).map((c) => `${c} = excluded.${c}`).join(', ');
  return `insert into public.${table} (${cols.join(', ')}) values\n${values}\non conflict (${conflict}) do update set ${updates};\n`;
};

const ts = ['created_at', 'updated_at'];
const sql = [
  '-- PULSE — демонстрационные данные (сгенерировано scripts/build-seed.mjs, не редактировать вручную).',
  '-- Все строки помечены is_demo = true. Пользовательские результаты не создаются.',
  '-- Повторный запуск безопасен: строки обновляются по первичному ключу.',
  '',
  insert('exercise_categories', data.exercise_categories, 'id', ts),
  insert('exercises', data.exercises, 'id', ts),
  insert('workout_programs', data.workout_programs, 'id', ts),
  insert('workout_exercises', data.workout_exercises, 'id'),
  insert('food_products', data.food_products, 'id', ts),
  insert('achievements', data.achievements, 'id'),
  insert('app_settings', data.app_settings, 'key', ts),
].join('\n');

writeFileSync(join(root, 'supabase', 'seed.sql'), sql, 'utf8');
mkdirSync(join(root, 'mobile', 'src', 'demo'), { recursive: true });
writeFileSync(join(root, 'mobile', 'src', 'demo', 'seedData.json'), JSON.stringify(data, null, 1), 'utf8');

console.log(
  Object.entries(data).map(([k, v]) => `${k}: ${v.length}`).join(', '),
);
