// Проверка миграции и seed на встроенном Postgres (PGlite) с заглушками Supabase.
// Запуск: cd sqlcheck && npm install && node check.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

process.on('uncaughtException', (e) => {
  console.log(`FAILED: ${e.message}${e.position ? ` (position ${e.position})` : ''}`);
  process.exit(1);
});
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = new PGlite();
const assert = (cond, msg) => {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok  ${msg}`);
};

// Заглушки окружения Supabase
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
  grant usage on schema auth to authenticated, anon;
  grant execute on all functions in schema auth to authenticated, anon;
`);

const migration = readFileSync(join(root, 'supabase/migrations/20261113000000_init.sql'), 'utf8');
await db.exec(migration);
console.log('migration applied');
await db.exec(migration);
console.log('migration re-applied (idempotent)');

const seed = readFileSync(join(root, 'supabase/seed.sql'), 'utf8');
await db.exec(seed);
await db.exec(seed);
console.log('seed applied twice');

const one = async (q, p) => (await db.query(q, p)).rows[0];
const as = async (uid, fn) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false); select set_config('request.jwt.claim.role', 'authenticated', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
};
const fails = async (fn) => {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
};

const a = (await one(`insert into auth.users (email, raw_user_meta_data) values ('a@test.dev', '{"first_name":"Анна","last_name":"Тест"}') returning id`)).id;
const b = (await one(`insert into auth.users (email) values ('b@test.dev') returning id`)).id;

assert((await one(`select first_name from profiles where id = $1`, [a])).first_name === 'Анна', 'trigger creates profile from metadata');
assert((await one(`select count(*)::int c from user_settings`)).c === 2, 'trigger creates user_settings');
assert((await one(`select count(*)::int c from notification_preferences`)).c === 2, 'trigger creates notification_preferences');

const ex = await db.query(`select id, name from exercises order by name limit 2`);
const prog = (await one(`select id from workout_programs limit 1`)).id;

await as(a, async () => {
  assert((await one(`select count(*)::int c from profiles`)).c === 1, 'user sees only own profile');
  assert((await one(`select count(*)::int c from exercises`)).c === 27, 'user reads exercise catalog');
  assert(await fails(() => db.query(`insert into exercises (category_id, name) select id, 'x' from exercise_categories limit 1`)), 'user cannot write catalog');
  assert(await fails(() => db.query(`insert into user_roles (user_id, role) values ($1, 'admin')`, [a])), 'user cannot grant self admin');
  assert(await fails(() => db.query(`insert into user_measurements (user_id, weight_kg) values ($1, 70)`, [b])), 'user cannot insert rows for another user');
  await db.query(`insert into user_measurements (user_id, weight_kg, measured_on) values ($1, 71.5, current_date)`, [a]);
  await db.query(`update profiles set is_blocked = true, first_name = 'Аня' where id = $1`, [a]);
  assert(await fails(() => db.query(`insert into workout_sessions (user_id, program_name, started_at, finished_at, duration_sec) values ($1, 'x', now(), now(), 1)`, [a])), 'sessions are written only via finish_workout');
  assert(await fails(() => db.query(`insert into user_achievements (user_id, achievement_id) select $1, id from achievements limit 1`, [a])), 'user cannot grant self achievements');

  const sets = [
    { exercise_id: ex.rows[0].id, exercise_name: ex.rows[0].name, exercise_position: 0, set_number: 1, weight_kg: 40, reps: 10 },
    { exercise_id: ex.rows[0].id, exercise_name: ex.rows[0].name, exercise_position: 0, set_number: 2, weight_kg: 45, reps: 8 },
    { exercise_id: ex.rows[1].id, exercise_name: ex.rows[1].name, exercise_position: 1, set_number: 1, weight_kg: 0, reps: 15 },
  ];
  const sid = (await one(`select finish_workout($1, 'Тест', now() - interval '30 minutes', now(), 1800, $2::jsonb) as id`, [prog, JSON.stringify(sets)])).id;
  const s = await one(`select sets_count, exercises_count, total_volume_kg::float v from workout_sessions where id = $1`, [sid]);
  assert(s.sets_count === 3 && s.exercises_count === 2 && s.v === 760, 'finish_workout computes totals (40*10 + 45*8 = 760)');
  assert((await one(`select weight_kg::float w from personal_records`)).w === 45, 'personal record = heaviest set');
  assert((await one(`select count(*)::int c from workout_sets where is_pr`)).c === 2, 'PR flags set on record-breaking sets');
  const ach = await db.query(`select a.code from user_achievements ua join achievements a on a.id = ua.achievement_id order by a.code`);
  assert(ach.rows.map((r) => r.code).join() === 'first_pr,first_workout', 'achievements unlocked from real data only');
  assert((await one(`select count(*)::int c from notifications where type = 'achievement'`)).c === 2, 'achievement notifications created');
  assert(await fails(() => db.query(`select admin_stats()`)), 'non-admin cannot call admin_stats');
});

const pa = await one(`select is_blocked, first_name, weight_kg::float w from profiles where id = $1`, [a]);
assert(pa.is_blocked === false && pa.first_name === 'Аня', 'user cannot flip is_blocked, other fields update');
assert(pa.w === 71.5, 'measurement syncs profile weight');

await as(b, async () => {
  assert((await one(`select count(*)::int c from workout_sessions`)).c === 0, 'other user sees no foreign sessions');
  assert((await one(`select count(*)::int c from user_measurements`)).c === 0, 'other user sees no foreign measurements');
  assert((await one(`select count(*)::int c from notifications`)).c === 0, 'other user sees no foreign notifications');
});

await db.query(`insert into user_roles (user_id, role) values ($1, 'admin')`, [b]);
await as(b, async () => {
  const stats = (await one(`select admin_stats() s`)).s;
  assert(stats.users === 2 && stats.sessions_total === 1, 'admin_stats works for admin');
  assert((await one(`select count(*)::int c from profiles`)).c === 2, 'admin sees all profiles');
  await db.query(`update profiles set is_blocked = true where id = $1`, [a]);
  await db.query(`insert into exercise_categories (slug, name) values ('test', 'Тест')`);
});
assert((await one(`select is_blocked from profiles where id = $1`, [a])).is_blocked === true, 'admin can block user');

await db.query(`delete from auth.users where id = $1`, [a]);
assert((await one(`select count(*)::int c from workout_sets`)).c === 0, 'deleting auth user cascades all personal data');

console.log('\nALL SQL CHECKS PASSED');
