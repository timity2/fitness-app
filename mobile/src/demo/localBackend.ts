// Локальный демо-бэкенд: повторяет используемое приложением подмножество API supabase-js
// и хранит данные только на устройстве (AsyncStorage). Включается, когда не заданы
// EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Правила видимости строк
// имитируют RLS: пользователь видит только свои данные и общий каталог.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import seed from './seedData.json';

type Row = Record<string, any>;
type DbError = { message: string; code?: string };
type Result = { data: any; error: DbError | null };

interface DemoUser {
  id: string;
  email: string;
  pass: string;
  meta: Row;
  created_at: string;
}

interface DemoState {
  tables: Record<string, Row[]>;
  users: DemoUser[];
  currentUserId: string | null;
}

const KEY = 'pulse.demo.db.v1';

const USER_COL: Record<string, string> = {
  profiles: 'id',
  user_goals: 'user_id',
  user_settings: 'user_id',
  user_measurements: 'user_id',
  body_progress_photos: 'user_id',
  user_programs: 'user_id',
  workout_sessions: 'user_id',
  workout_sets: 'user_id',
  personal_records: 'user_id',
  active_workouts: 'user_id',
  user_achievements: 'user_id',
  food_favorites: 'user_id',
  nutrition_entries: 'user_id',
  water_entries: 'user_id',
  notifications: 'user_id',
  notification_preferences: 'user_id',
};
const OWNER_TABLES = ['workout_programs', 'food_products'];
const CATALOG_TABLES = [
  'exercise_categories',
  'exercises',
  'workout_programs',
  'workout_exercises',
  'food_products',
  'achievements',
  'app_settings',
];
const PK: Record<string, string[]> = {
  profiles: ['id'],
  user_settings: ['user_id'],
  notification_preferences: ['user_id'],
  active_workouts: ['user_id'],
  user_programs: ['user_id', 'program_id'],
  food_favorites: ['user_id', 'product_id'],
  user_achievements: ['user_id', 'achievement_id'],
  app_settings: ['key'],
};
const DEFAULTS: Record<string, Row> = {
  notifications: { is_read: false, body: '' },
  user_goals: { is_active: true, preferred_days: [], start_weight_kg: null, target_weight_kg: null },
  user_programs: { is_active: false },
  body_progress_photos: { note: '' },
  food_products: { category: 'other', is_demo: false, is_published: true, image_url: null },
  workout_programs: { is_demo: false, is_published: true, image_url: null, target_muscles: [] },
  user_measurements: { weight_kg: null, chest_cm: null, waist_cm: null, hips_cm: null, arm_cm: null, leg_cm: null },
};

const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

let state: DemoState = { tables: {}, users: [], currentUserId: null };
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const seedTables = seed as unknown as Record<string, Row[]>;

const ready: Promise<void> = (async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw) as DemoState;
  } catch {
    // повреждённое хранилище — начинаем с чистого состояния
  }
  // Каталог всегда берётся из актуального seed; пользовательские строки сохраняются
  for (const t of CATALOG_TABLES) {
    const own = (state.tables[t] ?? []).filter((r) => r.owner_id);
    const ownProgramIds = new Set((state.tables.workout_programs ?? []).filter((r) => r.owner_id).map((r) => r.id));
    const keep = t === 'workout_exercises' ? (state.tables[t] ?? []).filter((r) => ownProgramIds.has(r.program_id)) : own;
    state.tables[t] = [...(seedTables[t] ?? []), ...keep];
  }
})();

function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => undefined);
  }, 150);
}

const table = (name: string) => (state.tables[name] ??= []);

function visible(name: string, row: Row): boolean {
  const uid = state.currentUserId;
  const col = USER_COL[name];
  if (col) return uid !== null && row[col] === uid;
  if (OWNER_TABLES.includes(name)) return row.owner_id == null || row.owner_id === uid;
  if (name === 'workout_exercises') {
    const p = table('workout_programs').find((x) => x.id === row.program_id);
    return !!p && (p.owner_id == null || p.owner_id === uid);
  }
  return true;
}

function writable(name: string, row: Row): boolean {
  const uid = state.currentUserId;
  if (!uid) return false;
  const col = USER_COL[name];
  if (col) return row[col] === uid;
  if (OWNER_TABLES.includes(name)) return row.owner_id === uid;
  if (name === 'workout_exercises') {
    const p = table('workout_programs').find((x) => x.id === row.program_id);
    return !!p && p.owner_id === uid;
  }
  return false; // общий каталог в демо-режиме только для чтения
}

type Op = 'select' | 'insert' | 'update' | 'upsert' | 'delete';

class Query implements PromiseLike<Result> {
  private op: Op = 'select';
  private filters: ((r: Row) => boolean)[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private max: number | null = null;
  private payload: Row | Row[] | null = null;
  private conflict: string[] | null = null;
  private mode: 'many' | 'single' | 'maybe' = 'many';

  constructor(private name: string) {}

  select(_cols?: string) {
    return this;
  }
  insert(values: Row | Row[]) {
    this.op = 'insert';
    this.payload = values;
    return this;
  }
  update(values: Row) {
    this.op = 'update';
    this.payload = values;
    return this;
  }
  upsert(values: Row | Row[], opts?: { onConflict?: string }) {
    this.op = 'upsert';
    this.payload = values;
    this.conflict = opts?.onConflict ? opts.onConflict.split(',').map((s) => s.trim()) : null;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  eq(col: string, v: unknown) {
    this.filters.push((r) => r[col] === v);
    return this;
  }
  neq(col: string, v: unknown) {
    this.filters.push((r) => r[col] !== v);
    return this;
  }
  in(col: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[col]));
    return this;
  }
  gte(col: string, v: any) {
    this.filters.push((r) => r[col] != null && r[col] >= v);
    return this;
  }
  lte(col: string, v: any) {
    this.filters.push((r) => r[col] != null && r[col] <= v);
    return this;
  }
  gt(col: string, v: any) {
    this.filters.push((r) => r[col] != null && r[col] > v);
    return this;
  }
  lt(col: string, v: any) {
    this.filters.push((r) => r[col] != null && r[col] < v);
    return this;
  }
  is(col: string, v: null | boolean) {
    this.filters.push((r) => (v === null ? r[col] == null : r[col] === v));
    return this;
  }
  not(col: string, _op: 'is', _v: null) {
    this.filters.push((r) => r[col] != null);
    return this;
  }
  ilike(col: string, pattern: string) {
    const needle = pattern.replace(/%/g, '').toLowerCase();
    this.filters.push((r) => String(r[col] ?? '').toLowerCase().includes(needle));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.mode = 'single';
    return this;
  }
  maybeSingle() {
    this.mode = 'maybe';
    return this;
  }

  then<A = Result, B = never>(
    onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return ready.then(() => this.run()).then(onfulfilled, onrejected);
  }

  private match(r: Row) {
    return this.filters.every((f) => f(r));
  }

  private finish(rows: Row[]): Result {
    let out = rows.map((r) => ({ ...r }));
    for (const o of [...this.orders].reverse()) {
      out.sort((a, b) => {
        const x = a[o.col];
        const y = b[o.col];
        if (x === y) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x < y ? -1 : 1) * (o.asc ? 1 : -1);
      });
    }
    if (this.max != null) out = out.slice(0, this.max);
    if (this.mode === 'many') return { data: out, error: null };
    if (out.length === 0) {
      return this.mode === 'maybe'
        ? { data: null, error: null }
        : { data: null, error: { message: 'Запись не найдена', code: 'PGRST116' } };
    }
    return { data: out[0], error: null };
  }

  private prepare(values: Row): Row {
    const row: Row = { ...(DEFAULTS[this.name] ?? {}), ...values };
    const pk = PK[this.name];
    if (!pk && !row.id) row.id = Crypto.randomUUID();
    if (row.created_at === undefined && this.name !== 'app_settings') row.created_at = nowIso();
    return row;
  }

  private run(): Result {
    const rows = table(this.name);
    const denied: Result = { data: null, error: { message: 'Недостаточно прав', code: '42501' } };

    if (this.op === 'select') {
      return this.finish(rows.filter((r) => visible(this.name, r) && this.match(r)));
    }

    if (this.op === 'insert' || this.op === 'upsert') {
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
      const result: Row[] = [];
      for (const values of list) {
        const keys = this.conflict ?? PK[this.name] ?? ['id'];
        const existing =
          this.op === 'upsert' && keys.every((k) => values[k] !== undefined)
            ? rows.find((r) => keys.every((k) => r[k] === values[k]))
            : undefined;
        if (existing) {
          if (!writable(this.name, existing)) return denied;
          Object.assign(existing, values, { updated_at: nowIso() });
          result.push(existing);
        } else {
          const row = this.prepare(values);
          if (!writable(this.name, row)) return denied;
          rows.push(row);
          result.push(row);
          afterInsert(this.name, row);
        }
      }
      persist();
      return this.finish(result);
    }

    const targets = rows.filter((r) => visible(this.name, r) && this.match(r));
    if (targets.some((r) => !writable(this.name, r))) return denied;

    if (this.op === 'update') {
      for (const r of targets) {
        Object.assign(r, this.payload, { updated_at: nowIso() });
        afterInsert(this.name, r);
      }
      persist();
      return this.finish(targets);
    }

    // delete (+ каскад для связанных таблиц)
    const ids = new Set(targets.map((r) => r.id));
    state.tables[this.name] = rows.filter((r) => !targets.includes(r));
    if (this.name === 'workout_sessions') {
      state.tables.workout_sets = table('workout_sets').filter((s) => !ids.has(s.session_id));
    }
    if (this.name === 'workout_programs') {
      state.tables.workout_exercises = table('workout_exercises').filter((s) => !ids.has(s.program_id));
      state.tables.user_programs = table('user_programs').filter((s) => !ids.has(s.program_id));
    }
    if (this.name === 'food_products') {
      state.tables.food_favorites = table('food_favorites').filter((s) => !ids.has(s.product_id));
    }
    persist();
    return this.finish(targets);
  }
}

// Аналог триггера sync_profile_weight
function afterInsert(name: string, row: Row) {
  if (name === 'user_measurements' && row.weight_kg != null) {
    const newer = table('user_measurements').some(
      (m) => m.user_id === row.user_id && m.weight_kg != null && m.measured_on > row.measured_on,
    );
    if (!newer) {
      const p = table('profiles').find((x) => x.id === row.user_id);
      if (p) p.weight_kg = row.weight_kg;
    }
  }
}

// ---------------- RPC ----------------
function checkAchievements(uid: string): Row[] {
  const sessions = table('workout_sessions').filter((s) => s.user_id === uid);
  const hasPr = table('personal_records').some((r) => r.user_id === uid);
  const days = [...new Set(sessions.map((s) => String(s.finished_at).slice(0, 10)))].sort();
  let streak = 0;
  let cur = 0;
  let prev: number | null = null;
  for (const d of days) {
    const t = Date.parse(d);
    cur = prev !== null && t - prev === 86400000 ? cur + 1 : 1;
    streak = Math.max(streak, cur);
    prev = t;
  }
  const unlocked: Row[] = [];
  for (const a of table('achievements')) {
    const ok =
      a.condition_type === 'workouts_total'
        ? sessions.length >= a.threshold
        : a.condition_type === 'first_pr'
          ? hasPr
          : streak >= a.threshold;
    const has = table('user_achievements').some((u) => u.user_id === uid && u.achievement_id === a.id);
    if (ok && !has) {
      const row = { user_id: uid, achievement_id: a.id, unlocked_at: nowIso() };
      table('user_achievements').push(row);
      table('notifications').push({
        id: Crypto.randomUUID(),
        user_id: uid,
        type: 'achievement',
        title: 'Новое достижение',
        body: a.title,
        is_read: false,
        created_at: nowIso(),
      });
      unlocked.push(row);
    }
  }
  return unlocked;
}

function finishWorkout(uid: string, p: Row): Result {
  const sets = (p.p_sets ?? []) as Row[];
  if (!Array.isArray(sets) || sets.length === 0) return { data: null, error: { message: 'no completed sets' } };
  const sessionId = Crypto.randomUUID();
  let volume = 0;
  const positions = new Set<number>();
  const sorted = [...sets].sort((a, b) => a.exercise_position - b.exercise_position || a.set_number - b.set_number);
  for (const s of sorted) {
    let isPr = false;
    const weight = Number(s.weight_kg) || 0;
    const reps = Number(s.reps) || 0;
    if (s.exercise_id && weight > 0 && reps > 0) {
      const prs = table('personal_records');
      const prev = prs.find((r) => r.user_id === uid && r.exercise_id === s.exercise_id);
      if (!prev || weight > prev.weight_kg) {
        isPr = true;
        const rec = {
          id: prev?.id ?? Crypto.randomUUID(),
          user_id: uid,
          exercise_id: s.exercise_id,
          exercise_name: s.exercise_name,
          weight_kg: weight,
          reps,
          session_id: sessionId,
          achieved_at: p.p_finished_at,
        };
        if (prev) Object.assign(prev, rec);
        else prs.push(rec);
      }
    }
    volume += weight * reps;
    positions.add(s.exercise_position);
    table('workout_sets').push({
      id: Crypto.randomUUID(),
      session_id: sessionId,
      user_id: uid,
      exercise_id: s.exercise_id ?? null,
      exercise_name: s.exercise_name,
      exercise_position: s.exercise_position ?? 0,
      set_number: s.set_number,
      weight_kg: weight,
      reps,
      is_pr: isPr,
      completed_at: nowIso(),
    });
  }
  table('workout_sessions').push({
    id: sessionId,
    user_id: uid,
    program_id: p.p_program_id ?? null,
    program_name: p.p_program_name || 'Тренировка',
    started_at: p.p_started_at,
    finished_at: p.p_finished_at,
    duration_sec: Math.max(0, Number(p.p_duration_sec) || 0),
    exercises_count: positions.size,
    sets_count: sorted.length,
    total_volume_kg: Math.round(volume * 10) / 10,
    created_at: nowIso(),
  });
  state.tables.active_workouts = table('active_workouts').filter((a) => a.user_id !== uid);
  checkAchievements(uid);
  persist();
  return { data: sessionId, error: null };
}

async function rpc(name: string, params: Row = {}): Promise<Result> {
  await ready;
  const uid = state.currentUserId;
  if (!uid) return { data: null, error: { message: 'not authenticated' } };
  if (name === 'finish_workout') return finishWorkout(uid, params);
  if (name === 'check_achievements') {
    const rows = checkAchievements(uid);
    persist();
    return { data: rows, error: null };
  }
  return { data: null, error: { message: `Функция ${name} недоступна в демо-режиме` } };
}

// ---------------- Auth ----------------
type AuthListener = (event: string, session: Row | null) => void;
const listeners = new Set<AuthListener>();

const hash = (email: string, password: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `pulse-demo:${email}:${password}`);

function sessionOf(u: DemoUser | undefined): Row | null {
  if (!u) return null;
  return {
    access_token: 'demo',
    refresh_token: 'demo',
    token_type: 'bearer',
    expires_in: 3600,
    user: { id: u.id, email: u.email, user_metadata: u.meta, created_at: u.created_at },
  };
}

const currentUser = () => state.users.find((u) => u.id === state.currentUserId);
const emit = (event: string) => listeners.forEach((l) => l(event, sessionOf(currentUser())));
const authError = (message: string) => ({ message, name: 'AuthError', status: 400 });

const auth = {
  async getSession() {
    await ready;
    return { data: { session: sessionOf(currentUser()) }, error: null };
  },
  async getUser() {
    await ready;
    return { data: { user: sessionOf(currentUser())?.user ?? null }, error: null };
  },
  onAuthStateChange(cb: AuthListener) {
    listeners.add(cb);
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
  },
  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Row } }) {
    await ready;
    const mail = email.trim().toLowerCase();
    if (state.users.some((u) => u.email === mail)) {
      return { data: { user: null, session: null }, error: authError('User already registered') };
    }
    const user: DemoUser = {
      id: Crypto.randomUUID(),
      email: mail,
      pass: await hash(mail, password),
      meta: options?.data ?? {},
      created_at: nowIso(),
    };
    state.users.push(user);
    // аналог триггера handle_new_user
    table('profiles').push({
      id: user.id,
      first_name: user.meta.first_name ?? '',
      last_name: user.meta.last_name ?? '',
      avatar_url: null,
      birth_date: null,
      gender: null,
      height_cm: null,
      weight_kg: null,
      fitness_level: null,
      onboarding_completed: false,
      is_blocked: false,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    table('user_settings').push({
      user_id: user.id,
      unit_system: 'metric',
      language: 'ru',
      injuries: '',
      exercise_restrictions: '',
      special_notes: '',
      calorie_goal: null,
      protein_goal_g: null,
      fat_goal_g: null,
      carbs_goal_g: null,
      water_goal_ml: 2000,
      timer_sound: true,
      timer_vibration: true,
    });
    table('notification_preferences').push({
      user_id: user.id,
      enabled: false,
      workout_enabled: true,
      workout_time: '18:00',
      nutrition_enabled: true,
      nutrition_time: '13:00',
      water_enabled: true,
      water_time: '11:00',
      goal_enabled: true,
      goal_time: '09:00',
      achievement_enabled: true,
      system_enabled: true,
    });
    state.currentUserId = user.id;
    persist();
    emit('SIGNED_IN');
    const session = sessionOf(user);
    return { data: { user: session!.user, session }, error: null };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    await ready;
    const mail = email.trim().toLowerCase();
    const user = state.users.find((u) => u.email === mail);
    if (!user || user.pass !== (await hash(mail, password))) {
      return { data: { user: null, session: null }, error: authError('Invalid login credentials') };
    }
    state.currentUserId = user.id;
    persist();
    emit('SIGNED_IN');
    const session = sessionOf(user);
    return { data: { user: session!.user, session }, error: null };
  },
  async signOut() {
    await ready;
    state.currentUserId = null;
    persist();
    emit('SIGNED_OUT');
    return { error: null };
  },
  async resetPasswordForEmail(_email: string, _opts?: Row) {
    await ready;
    return { data: {}, error: null };
  },
  async resend(_opts: Row) {
    return { data: {}, error: null };
  },
  async updateUser({ password, data }: { password?: string; data?: Row }) {
    await ready;
    const user = currentUser();
    if (!user) return { data: { user: null }, error: authError('Not authenticated') };
    if (password) user.pass = await hash(user.email, password);
    if (data) user.meta = { ...user.meta, ...data };
    persist();
    emit('USER_UPDATED');
    return { data: { user: sessionOf(user)!.user }, error: null };
  },
  async setSession(_tokens: Row) {
    return { data: { session: null }, error: authError('Недоступно в демо-режиме') };
  },
  async exchangeCodeForSession(_code: string) {
    return { data: { session: null }, error: authError('Недоступно в демо-режиме') };
  },
  /** Только демо-режим: смена пароля по email без письма (на устройстве нет почтового сервера). */
  async demoResetPassword(email: string, password: string) {
    await ready;
    const mail = email.trim().toLowerCase();
    const user = state.users.find((u) => u.email === mail);
    if (!user) return { error: authError('Аккаунт с таким email не найден на этом устройстве') };
    user.pass = await hash(mail, password);
    persist();
    return { error: null };
  },
  startAutoRefresh() {},
  stopAutoRefresh() {},
};

// ---------------- Edge Functions ----------------
const functions = {
  async invoke(name: string, _opts?: Row): Promise<Result> {
    await ready;
    const uid = state.currentUserId;
    if (name === 'delete-account' && uid) {
      for (const [t, col] of Object.entries(USER_COL)) {
        state.tables[t] = table(t).filter((r) => r[col] !== uid);
      }
      for (const t of OWNER_TABLES) state.tables[t] = table(t).filter((r) => r.owner_id !== uid);
      state.users = state.users.filter((u) => u.id !== uid);
      state.currentUserId = null;
      persist();
      emit('SIGNED_OUT');
      return { data: { ok: true }, error: null };
    }
    return { data: null, error: { message: `Функция ${name} недоступна в демо-режиме` } };
  },
};

export const demoClient = {
  from: (name: string) => new Query(name),
  rpc,
  auth,
  functions,
};

export { today as demoToday };
