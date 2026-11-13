import type { FitnessLevel, GoalType, MealType, UnitSystem } from '@/types/db';

const pad = (n: number) => String(n).padStart(2, '0');

/** Локальная дата в формате YYYY-MM-DD */
export const toISODate = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseISODate = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** Понедельник текущей недели, 00:00 */
export const startOfWeek = (d: Date = new Date()) => {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
};

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const formatDate = (s: string | Date, withYear = true) => {
  const d = typeof s === 'string' ? (s.length <= 10 ? parseISODate(s) : new Date(s)) : s;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
};

export const formatShortDate = (s: string | Date) => {
  const d = typeof s === 'string' ? (s.length <= 10 ? parseISODate(s) : new Date(s)) : s;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

export const relativeDay = (iso: string) => {
  const today = toISODate();
  if (iso === today) return 'Сегодня';
  if (iso === toISODate(addDays(new Date(), -1))) return 'Вчера';
  if (iso === toISODate(addDays(new Date(), 1))) return 'Завтра';
  return formatDate(iso, false);
};

export const formatDuration = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  if (m > 0) return `${m} мин`;
  return `${s} с`;
};

export const formatClock = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

export const formatNumber = (n: number, digits = 0) =>
  n
    .toFixed(digits)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    .replace('.', ',');

/** Склонение: plural(5, 'тренировка', 'тренировки', 'тренировок') */
export const plural = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
};

export const ageFrom = (birth: string | null) => {
  if (!birth) return null;
  const b = parseISODate(birth);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age -= 1;
  return age;
};

/** Разбор числа из поля ввода: принимает запятую и точку */
export const parseNumber = (s: string): number | null => {
  const v = Number(String(s).replace(',', '.').trim());
  return String(s).trim() === '' || Number.isNaN(v) ? null : v;
};

// ---- Единицы измерения (в базе всегда метрическая система) ----
const KG_IN_LB = 0.45359237;
const CM_IN_IN = 2.54;
const round1 = (n: number) => Math.round(n * 10) / 10;

export const units = (system: UnitSystem) => {
  const imperial = system === 'imperial';
  return {
    imperial,
    weightUnit: imperial ? 'фунт' : 'кг',
    lengthUnit: imperial ? 'дюйм' : 'см',
    toWeight: (kg: number) => (imperial ? round1(kg / KG_IN_LB) : round1(kg)),
    fromWeight: (v: number) => (imperial ? round1(v * KG_IN_LB) : round1(v)),
    toLength: (cm: number) => (imperial ? round1(cm / CM_IN_IN) : round1(cm)),
    fromLength: (v: number) => (imperial ? round1(v * CM_IN_IN) : round1(v)),
    weight: (kg: number | null | undefined) =>
      kg == null ? '—' : `${formatNumber(imperial ? kg / KG_IN_LB : kg, 1).replace(',0', '')} ${imperial ? 'фунт' : 'кг'}`,
    length: (cm: number | null | undefined) =>
      cm == null ? '—' : `${formatNumber(imperial ? cm / CM_IN_IN : cm, 1).replace(',0', '')} ${imperial ? 'дюйм' : 'см'}`,
  };
};

// ---- Подписи справочных значений ----
export const GOAL_LABELS: Record<GoalType, string> = {
  muscle_gain: 'Набор мышечной массы',
  weight_loss: 'Снижение веса',
  maintenance: 'Поддержание формы',
  strength: 'Развитие силы',
  endurance: 'Повышение выносливости',
};

export const LEVEL_LABELS: Record<FitnessLevel, string> = {
  beginner: 'Новичок',
  intermediate: 'Средний уровень',
  advanced: 'Продвинутый уровень',
};

export const LEVEL_SHORT: Record<FitnessLevel, string> = {
  beginner: 'Новичок',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекусы',
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  none: 'Без оборудования',
  dumbbells: 'Гантели',
  barbell: 'Штанга',
  machine: 'Тренажёр',
  kettlebell: 'Гиря',
  bands: 'Резинки',
  bar: 'Турник / брусья',
};

export const LOCATION_LABELS: Record<string, string> = { home: 'Дома', gym: 'В зале' };

export const TYPE_LABELS: Record<string, string> = {
  strength: 'Силовая',
  cardio: 'Кардио',
  hiit: 'Интервальная',
  mobility: 'Мобильность',
};

export const greeting = (d: Date = new Date()) => {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'Доброе утро';
  if (h >= 12 && h < 18) return 'Добрый день';
  if (h >= 18 && h < 23) return 'Добрый вечер';
  return 'Доброй ночи';
};
