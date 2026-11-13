-- =====================================================================
-- PULSE — полная схема базы данных (PostgreSQL / Supabase)
-- Развёртывание: Supabase SQL Editor → вставить файл целиком → Run,
-- либо `supabase db push`. Затем выполнить supabase/seed.sql.
-- Файл идемпотентен в части политик и триггеров (drop if exists).
-- =====================================================================

-- gen_random_uuid() встроена в PostgreSQL 13+, расширения не требуются.
-- Перечисления заданы через check-ограничения, чтобы их было проще менять миграциями.

-- ---------------------------------------------------------------------
-- 1. Профили и роли
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 60),
  last_name text not null default '' check (char_length(last_name) <= 60),
  avatar_url text,
  birth_date date check (birth_date is null or birth_date between date '1900-01-01' and current_date),
  gender text check (gender is null or gender in ('male', 'female', 'other')),
  height_cm numeric(5, 1) check (height_cm is null or height_cm between 80 and 260),
  weight_kg numeric(5, 1) check (weight_kg is null or weight_kg between 20 and 400),
  fitness_level text check (fitness_level is null or fitness_level in ('beginner', 'intermediate', 'advanced')),
  onboarding_completed boolean not null default false,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Роли хранятся отдельно. Клиент не может писать в эту таблицу:
-- для неё нет политик insert/update/delete, запись — только service_role / SQL Editor.
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin')),
  granted_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- 2. Цели, настройки, измерения, фото
-- ---------------------------------------------------------------------
create table if not exists public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_type text not null check (goal_type in ('muscle_gain', 'weight_loss', 'maintenance', 'strength', 'endurance')),
  start_weight_kg numeric(5, 1) check (start_weight_kg is null or start_weight_kg between 20 and 400),
  target_weight_kg numeric(5, 1) check (target_weight_kg is null or target_weight_kg between 20 and 400),
  workouts_per_week smallint not null default 3 check (workouts_per_week between 1 and 7),
  session_minutes smallint not null default 45 check (session_minutes between 10 and 240),
  preferred_days smallint[] not null default '{}', -- 1 = Пн … 7 = Вс
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists user_goals_one_active on public.user_goals (user_id) where is_active;
create index if not exists user_goals_user_idx on public.user_goals (user_id);

-- Настройки пользователя: единицы измерения, язык, ограничения, цели питания
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  language text not null default 'ru' check (language in ('ru', 'en')),
  injuries text not null default '' check (char_length(injuries) <= 1000),
  exercise_restrictions text not null default '' check (char_length(exercise_restrictions) <= 1000),
  special_notes text not null default '' check (char_length(special_notes) <= 1000),
  calorie_goal integer check (calorie_goal is null or calorie_goal between 800 and 10000),
  protein_goal_g integer check (protein_goal_g is null or protein_goal_g between 0 and 1000),
  fat_goal_g integer check (fat_goal_g is null or fat_goal_g between 0 and 1000),
  carbs_goal_g integer check (carbs_goal_g is null or carbs_goal_g between 0 and 2000),
  water_goal_ml integer not null default 2000 check (water_goal_ml between 250 and 10000),
  timer_sound boolean not null default true,
  timer_vibration boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5, 1) check (weight_kg is null or weight_kg between 20 and 400),
  chest_cm numeric(5, 1) check (chest_cm is null or chest_cm between 20 and 300),
  waist_cm numeric(5, 1) check (waist_cm is null or waist_cm between 20 and 300),
  hips_cm numeric(5, 1) check (hips_cm is null or hips_cm between 20 and 300),
  arm_cm numeric(5, 1) check (arm_cm is null or arm_cm between 10 and 150),
  leg_cm numeric(5, 1) check (leg_cm is null or leg_cm between 10 and 200),
  created_at timestamptz not null default now(),
  constraint user_measurements_not_empty check (
    num_nonnulls(weight_kg, chest_cm, waist_cm, hips_cm, arm_cm, leg_cm) > 0
  )
);
create index if not exists user_measurements_user_date_idx on public.user_measurements (user_id, measured_on desc);

create table if not exists public.body_progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  taken_on date not null default current_date,
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists body_progress_photos_user_idx on public.body_progress_photos (user_id, taken_on desc);

-- ---------------------------------------------------------------------
-- 3. Справочники упражнений и программы
-- ---------------------------------------------------------------------
create table if not exists public.exercise_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.exercise_categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  technique text not null default '',
  primary_muscles text[] not null default '{}',
  equipment text not null default 'none' check (equipment in ('none', 'dumbbells', 'barbell', 'machine', 'kettlebell', 'bands', 'bar')),
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  default_sets smallint not null default 3 check (default_sets between 1 and 20),
  default_reps smallint not null default 12 check (default_reps between 1 and 200),
  default_rest_sec smallint not null default 60 check (default_rest_sec between 0 and 900),
  tips text[] not null default '{}',
  mistakes text[] not null default '{}',
  image_url text,
  video_url text,
  is_demo boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists exercises_category_idx on public.exercises (category_id);

create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade, -- null = общая программа каталога
  category_id uuid references public.exercise_categories (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  goal_type text check (goal_type is null or goal_type in ('muscle_gain', 'weight_loss', 'maintenance', 'strength', 'endurance')),
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  duration_min smallint not null default 30 check (duration_min between 5 and 240),
  location text not null default 'gym' check (location in ('home', 'gym')),
  workout_type text not null default 'strength' check (workout_type in ('strength', 'cardio', 'hiit', 'mobility')),
  target_muscles text[] not null default '{}',
  image_url text,
  is_demo boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workout_programs_owner_idx on public.workout_programs (owner_id);
create index if not exists workout_programs_category_idx on public.workout_programs (category_id);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position smallint not null default 0,
  sets smallint not null default 3 check (sets between 1 and 20),
  reps smallint not null default 12 check (reps between 1 and 200),
  rest_sec smallint not null default 60 check (rest_sec between 0 and 900),
  unique (program_id, position)
);
create index if not exists workout_exercises_program_idx on public.workout_exercises (program_id, position);

-- Программы, выбранные пользователем («мои тренировки»); одна может быть активной
create table if not exists public.user_programs (
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references public.workout_programs (id) on delete cascade,
  is_active boolean not null default false,
  added_at timestamptz not null default now(),
  primary key (user_id, program_id)
);
create unique index if not exists user_programs_one_active on public.user_programs (user_id) where is_active;

-- ---------------------------------------------------------------------
-- 4. Тренировочные сессии (история), подходы, рекорды, незавершённые
-- ---------------------------------------------------------------------
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid references public.workout_programs (id) on delete set null,
  program_name text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  duration_sec integer not null check (duration_sec >= 0),
  exercises_count smallint not null default 0 check (exercises_count >= 0),
  sets_count smallint not null default 0 check (sets_count >= 0),
  total_volume_kg numeric(10, 1) not null default 0 check (total_volume_kg >= 0),
  created_at timestamptz not null default now(),
  constraint workout_sessions_time_order check (finished_at >= started_at)
);
create index if not exists workout_sessions_user_idx on public.workout_sessions (user_id, finished_at desc);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  exercise_name text not null,
  exercise_position smallint not null default 0,
  set_number smallint not null check (set_number between 1 and 50),
  weight_kg numeric(6, 2) not null default 0 check (weight_kg between 0 and 1000),
  reps smallint not null default 0 check (reps between 0 and 500),
  is_pr boolean not null default false,
  completed_at timestamptz not null default now()
);
create index if not exists workout_sets_session_idx on public.workout_sets (session_id);
create index if not exists workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_id, weight_kg desc);

create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  exercise_name text not null,
  weight_kg numeric(6, 2) not null check (weight_kg > 0),
  reps smallint not null check (reps > 0),
  session_id uuid references public.workout_sessions (id) on delete set null,
  achieved_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

-- Незавершённая тренировка: одна на пользователя, состояние хранится в jsonb
create table if not exists public.active_workouts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  program_id uuid references public.workout_programs (id) on delete set null,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Достижения
-- ---------------------------------------------------------------------
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null default '',
  icon text not null default 'trophy',
  condition_type text not null check (condition_type in ('workouts_total', 'first_pr', 'streak_days')),
  threshold integer not null default 1 check (threshold > 0),
  sort_order integer not null default 0,
  is_demo boolean not null default false
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------------
-- 6. Питание и вода
-- ---------------------------------------------------------------------
create table if not exists public.food_products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade, -- null = общий каталог
  name text not null check (char_length(name) between 1 and 120),
  category text not null default 'other',
  kcal_100 numeric(6, 1) not null check (kcal_100 between 0 and 950),
  protein_100 numeric(5, 1) not null default 0 check (protein_100 between 0 and 100),
  fat_100 numeric(5, 1) not null default 0 check (fat_100 between 0 and 100),
  carbs_100 numeric(5, 1) not null default 0 check (carbs_100 between 0 and 100),
  serving_g numeric(6, 1) not null default 100 check (serving_g > 0 and serving_g <= 5000),
  image_url text,
  external_source text, -- задел под внешнюю базу продуктов (например, Open Food Facts)
  external_id text,
  is_demo boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists food_products_name_idx on public.food_products (lower(name));
create index if not exists food_products_owner_idx on public.food_products (owner_id);
create unique index if not exists food_products_external_idx on public.food_products (external_source, external_id) where external_id is not null;

create table if not exists public.food_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.food_products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid references public.food_products (id) on delete set null,
  product_name text not null,
  entry_date date not null default current_date,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  grams numeric(7, 1) not null check (grams > 0 and grams <= 5000),
  -- значения на 100 г фиксируются в момент записи, чтобы история не менялась при правке справочника
  kcal_100 numeric(6, 1) not null check (kcal_100 >= 0),
  protein_100 numeric(5, 1) not null default 0,
  fat_100 numeric(5, 1) not null default 0,
  carbs_100 numeric(5, 1) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists nutrition_entries_user_date_idx on public.nutrition_entries (user_id, entry_date);

create table if not exists public.water_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null default current_date,
  amount_ml integer not null check (amount_ml > 0 and amount_ml <= 5000),
  created_at timestamptz not null default now()
);
create index if not exists water_entries_user_date_idx on public.water_entries (user_id, entry_date);

-- ---------------------------------------------------------------------
-- 7. Уведомления и системные настройки
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('workout', 'nutrition', 'water', 'goal', 'achievement', 'system')),
  title text not null,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  workout_enabled boolean not null default true,
  workout_time time not null default '18:00',
  nutrition_enabled boolean not null default true,
  nutrition_time time not null default '13:00',
  water_enabled boolean not null default true,
  water_time time not null default '11:00',
  goal_enabled boolean not null default true,
  goal_time time not null default '09:00',
  achievement_enabled boolean not null default true,
  system_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. Триггеры
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'user_goals', 'user_settings', 'exercises', 'workout_programs',
    'food_products', 'notification_preferences', 'app_settings', 'active_workouts'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t
    );
  end loop;
end $$;

-- Новый пользователь auth → профиль, настройки, предпочтения уведомлений
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 60),
    left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 60)
  )
  on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  insert into public.notification_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Пользователь не может сам менять служебные поля профиля (блокировка)
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_blocked is distinct from old.is_blocked
     and not public.is_admin()
     and coalesce(auth.role(), '') <> 'service_role' then
    new.is_blocked = old.is_blocked;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Запись веса в измерениях обновляет текущий вес профиля (если запись самая свежая)
create or replace function public.sync_profile_weight()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.weight_kg is not null and not exists (
    select 1 from public.user_measurements m
    where m.user_id = new.user_id and m.weight_kg is not null and m.measured_on > new.measured_on
  ) then
    update public.profiles set weight_kg = new.weight_kg where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_profile_weight on public.user_measurements;
create trigger sync_profile_weight
  after insert or update on public.user_measurements
  for each row execute function public.sync_profile_weight();

-- ---------------------------------------------------------------------
-- 9. SQL-функции (RPC)
-- ---------------------------------------------------------------------

-- Сохранение завершённой тренировки одной транзакцией.
-- Сервер сам считает объём, определяет личные рекорды и снимает незавершённую тренировку.
-- p_sets: [{exercise_id, exercise_name, exercise_position, set_number, weight_kg, reps}]
create or replace function public.finish_workout(
  p_program_id uuid,
  p_program_name text,
  p_started_at timestamptz,
  p_finished_at timestamptz,
  p_duration_sec integer,
  p_sets jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_session uuid;
  v_set record;
  v_prev numeric;
  v_is_pr boolean;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) = 0 then
    raise exception 'no completed sets';
  end if;
  if jsonb_array_length(p_sets) > 400 then
    raise exception 'too many sets';
  end if;

  insert into public.workout_sessions (user_id, program_id, program_name, started_at, finished_at, duration_sec)
  values (
    v_user,
    (select id from public.workout_programs where id = p_program_id),
    left(coalesce(nullif(p_program_name, ''), 'Тренировка'), 120),
    p_started_at,
    greatest(p_finished_at, p_started_at),
    greatest(coalesce(p_duration_sec, 0), 0)
  )
  returning id into v_session;

  for v_set in
    select *
    from jsonb_to_recordset(p_sets) as s(
      exercise_id uuid, exercise_name text, exercise_position smallint,
      set_number smallint, weight_kg numeric, reps smallint
    )
    order by exercise_position, set_number
  loop
    v_is_pr := false;
    if v_set.exercise_id is not null and coalesce(v_set.weight_kg, 0) > 0 and coalesce(v_set.reps, 0) > 0 then
      select pr.weight_kg into v_prev
      from public.personal_records pr
      where pr.user_id = v_user and pr.exercise_id = v_set.exercise_id;
      if v_prev is null or v_set.weight_kg > v_prev then
        v_is_pr := true;
        insert into public.personal_records (user_id, exercise_id, exercise_name, weight_kg, reps, session_id, achieved_at)
        values (v_user, v_set.exercise_id, v_set.exercise_name, v_set.weight_kg, v_set.reps, v_session, p_finished_at)
        on conflict (user_id, exercise_id) do update
          set weight_kg = excluded.weight_kg, reps = excluded.reps,
              session_id = excluded.session_id, achieved_at = excluded.achieved_at,
              exercise_name = excluded.exercise_name;
      end if;
    end if;

    insert into public.workout_sets (
      session_id, user_id, exercise_id, exercise_name, exercise_position, set_number, weight_kg, reps, is_pr
    )
    values (
      v_session, v_user,
      (select id from public.exercises where id = v_set.exercise_id),
      left(coalesce(v_set.exercise_name, 'Упражнение'), 120),
      coalesce(v_set.exercise_position, 0),
      v_set.set_number, coalesce(v_set.weight_kg, 0), coalesce(v_set.reps, 0), v_is_pr
    );
  end loop;

  update public.workout_sessions s
  set sets_count = agg.sets_count,
      exercises_count = agg.exercises_count,
      total_volume_kg = agg.volume
  from (
    select count(*) as sets_count,
           count(distinct exercise_position) as exercises_count,
           coalesce(sum(weight_kg * reps), 0) as volume
    from public.workout_sets where session_id = v_session
  ) agg
  where s.id = v_session;

  delete from public.active_workouts where user_id = v_user;
  perform public.check_achievements();
  return v_session;
end;
$$;

-- Достижения выдаются только сервером на основе фактических данных
create or replace function public.check_achievements()
returns setof public.user_achievements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_workouts integer;
  v_has_pr boolean;
  v_streak integer;
  a record;
  v_ok boolean;
  v_row public.user_achievements;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select count(*) into v_workouts from public.workout_sessions where user_id = v_user;
  select exists (select 1 from public.personal_records where user_id = v_user) into v_has_pr;

  -- самая длинная серия дней подряд с тренировкой
  select coalesce(max(len), 0) into v_streak
  from (
    select count(*) as len
    from (
      select d, d - (row_number() over (order by d))::integer as grp
      from (select distinct (finished_at at time zone 'utc')::date as d
            from public.workout_sessions where user_id = v_user) days
    ) g
    group by grp
  ) streaks;

  for a in select * from public.achievements loop
    v_ok := case a.condition_type
      when 'workouts_total' then v_workouts >= a.threshold
      when 'first_pr' then v_has_pr
      when 'streak_days' then v_streak >= a.threshold
      else false
    end;
    if v_ok then
      insert into public.user_achievements (user_id, achievement_id)
      values (v_user, a.id)
      on conflict do nothing
      returning * into v_row;
      if found then
        insert into public.notifications (user_id, type, title, body)
        values (v_user, 'achievement', 'Новое достижение', a.title);
        return next v_row;
      end if;
    end if;
  end loop;
  return;
end;
$$;

-- Сводная статистика для админ-панели
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'users_onboarded', (select count(*) from public.profiles where onboarding_completed),
    'users_blocked', (select count(*) from public.profiles where is_blocked),
    'new_users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'sessions_total', (select count(*) from public.workout_sessions),
    'sessions_7d', (select count(*) from public.workout_sessions where finished_at > now() - interval '7 days'),
    'exercises', (select count(*) from public.exercises),
    'programs', (select count(*) from public.workout_programs where owner_id is null),
    'products', (select count(*) from public.food_products where owner_id is null),
    'user_products', (select count(*) from public.food_products where owner_id is not null),
    'nutrition_entries_7d', (select count(*) from public.nutrition_entries where created_at > now() - interval '7 days')
  );
end;
$$;

revoke all on function public.finish_workout(uuid, text, timestamptz, timestamptz, integer, jsonb) from public, anon;
revoke all on function public.check_achievements() from public, anon;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.finish_workout(uuid, text, timestamptz, timestamptz, integer, jsonb) to authenticated;
grant execute on function public.check_achievements() to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.is_admin() to authenticated, anon;

-- ---------------------------------------------------------------------
-- 10. Row Level Security
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'user_roles', 'user_goals', 'user_settings', 'user_measurements', 'body_progress_photos',
    'exercise_categories', 'exercises', 'workout_programs', 'workout_exercises', 'user_programs',
    'workout_sessions', 'workout_sets', 'personal_records', 'active_workouts',
    'achievements', 'user_achievements', 'food_products', 'food_favorites',
    'nutrition_entries', 'water_entries', 'notifications', 'notification_preferences', 'app_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Вспомогательная процедура: «владелец делает всё со своими строками»
do $$
declare
  t text;
  col text;
begin
  -- таблицы с полным доступом владельца (select/insert/update/delete)
  foreach t in array array[
    'user_goals', 'user_settings', 'user_measurements', 'body_progress_photos', 'user_programs',
    'active_workouts', 'food_favorites', 'nutrition_entries', 'water_entries', 'notification_preferences'
  ] loop
    execute format('drop policy if exists own_all on public.%I', t);
    execute format(
      'create policy own_all on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t
    );
    execute format('drop policy if exists admin_read on public.%I', t);
  end loop;

  -- таблицы «только чтение своих строк»: запись идёт через security definer функции
  foreach t in array array['workout_sessions', 'workout_sets', 'personal_records', 'user_achievements'] loop
    execute format('drop policy if exists own_read on public.%I', t);
    execute format(
      'create policy own_read on public.%I for select to authenticated using (user_id = auth.uid())', t
    );
  end loop;
end $$;

-- историю тренировок пользователь может удалить
drop policy if exists own_delete on public.workout_sessions;
create policy own_delete on public.workout_sessions for delete to authenticated using (user_id = auth.uid());

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- user_roles: пользователь видит только свою роль, менять не может никто из клиентов
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid());

-- notifications: читать/отмечать/удалять свои; создаёт сервер или администратор
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());
drop policy if exists notifications_admin_insert on public.notifications;
create policy notifications_admin_insert on public.notifications for insert to authenticated
  with check (public.is_admin());

-- Общие справочники: читать опубликованное могут все авторизованные, менять — только админ
do $$
declare t text;
begin
  foreach t in array array['exercise_categories', 'achievements'] loop
    execute format('drop policy if exists catalog_read on public.%I', t);
    execute format('create policy catalog_read on public.%I for select to authenticated using (true)', t);
    execute format('drop policy if exists catalog_admin_write on public.%I', t);
    execute format(
      'create policy catalog_admin_write on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t
    );
  end loop;
end $$;

drop policy if exists exercises_read on public.exercises;
create policy exercises_read on public.exercises for select to authenticated
  using (is_published or public.is_admin());
drop policy if exists exercises_admin_write on public.exercises;
create policy exercises_admin_write on public.exercises for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- программы: общие опубликованные + свои; свои можно менять, общие — только админ
drop policy if exists programs_read on public.workout_programs;
create policy programs_read on public.workout_programs for select to authenticated
  using ((owner_id is null and is_published) or owner_id = auth.uid() or public.is_admin());
drop policy if exists programs_own_write on public.workout_programs;
create policy programs_own_write on public.workout_programs for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists programs_admin_write on public.workout_programs;
create policy programs_admin_write on public.workout_programs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists workout_exercises_read on public.workout_exercises;
create policy workout_exercises_read on public.workout_exercises for select to authenticated
  using (exists (
    select 1 from public.workout_programs p
    where p.id = program_id
      and ((p.owner_id is null and p.is_published) or p.owner_id = auth.uid() or public.is_admin())
  ));
drop policy if exists workout_exercises_write on public.workout_exercises;
create policy workout_exercises_write on public.workout_exercises for all to authenticated
  using (exists (
    select 1 from public.workout_programs p
    where p.id = program_id and (p.owner_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.workout_programs p
    where p.id = program_id and (p.owner_id = auth.uid() or public.is_admin())
  ));

-- продукты: общий каталог + собственные
drop policy if exists food_read on public.food_products;
create policy food_read on public.food_products for select to authenticated
  using ((owner_id is null and is_published) or owner_id = auth.uid() or public.is_admin());
drop policy if exists food_own_write on public.food_products;
create policy food_own_write on public.food_products for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists food_admin_write on public.food_products;
create policy food_admin_write on public.food_products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- app_settings: публичные ключи читают все, остальное — админ
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select to authenticated
  using (is_public or public.is_admin());
drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Администратор читает агрегируемые пользовательские таблицы (только чтение)
drop policy if exists admin_read on public.workout_sessions;
create policy admin_read on public.workout_sessions for select to authenticated using (public.is_admin());
drop policy if exists admin_read on public.user_goals;
create policy admin_read on public.user_goals for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- 11. Права таблиц (RLS действует поверх)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
revoke insert, update, delete on public.user_roles from authenticated;

-- ---------------------------------------------------------------------
-- 12. Storage: приватные фото прогресса и аватары
-- Путь объекта: <user_id>/<имя файла>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false), ('avatars', 'avatars', false)
on conflict (id) do nothing;

drop policy if exists pulse_own_files_select on storage.objects;
create policy pulse_own_files_select on storage.objects for select to authenticated
  using (bucket_id in ('progress-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists pulse_own_files_insert on storage.objects;
create policy pulse_own_files_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('progress-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists pulse_own_files_update on storage.objects;
create policy pulse_own_files_update on storage.objects for update to authenticated
  using (bucket_id in ('progress-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists pulse_own_files_delete on storage.objects;
create policy pulse_own_files_delete on storage.objects for delete to authenticated
  using (bucket_id in ('progress-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
