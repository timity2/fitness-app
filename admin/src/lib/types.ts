export type Level = 'beginner' | 'intermediate' | 'advanced';
export type GoalType = 'muscle_gain' | 'weight_loss' | 'maintenance' | 'strength' | 'endurance';

export interface Category {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  is_demo: boolean;
}

export interface Exercise {
  id: string;
  category_id: string;
  name: string;
  description: string;
  technique: string;
  primary_muscles: string[];
  equipment: string;
  difficulty: Level;
  default_sets: number;
  default_reps: number;
  default_rest_sec: number;
  tips: string[];
  mistakes: string[];
  image_url: string | null;
  video_url: string | null;
  is_demo: boolean;
  is_published: boolean;
}

export interface Program {
  id: string;
  owner_id: string | null;
  category_id: string | null;
  name: string;
  description: string;
  goal_type: GoalType | null;
  difficulty: Level;
  duration_min: number;
  location: 'home' | 'gym';
  workout_type: 'strength' | 'cardio' | 'hiit' | 'mobility';
  target_muscles: string[];
  image_url: string | null;
  is_demo: boolean;
  is_published: boolean;
  created_at: string;
}

export interface ProgramExercise {
  id?: string;
  program_id?: string;
  exercise_id: string;
  position: number;
  sets: number;
  reps: number;
  rest_sec: number;
}

export interface Food {
  id: string;
  owner_id: string | null;
  name: string;
  category: string;
  kcal_100: number;
  protein_100: number;
  fat_100: number;
  carbs_100: number;
  serving_g: number;
  image_url: string | null;
  external_source: string | null;
  external_id: string | null;
  is_demo: boolean;
  is_published: boolean;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: unknown;
  is_public: boolean;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  profile: {
    first_name: string;
    last_name: string;
    fitness_level: Level | null;
    onboarding_completed: boolean;
    is_blocked: boolean;
  } | null;
}

export const LEVELS: Record<Level, string> = { beginner: 'Новичок', intermediate: 'Средний', advanced: 'Продвинутый' };
export const GOALS: Record<GoalType, string> = {
  muscle_gain: 'Набор массы',
  weight_loss: 'Снижение веса',
  maintenance: 'Поддержание формы',
  strength: 'Сила',
  endurance: 'Выносливость',
};
export const EQUIPMENT: Record<string, string> = {
  none: 'Без оборудования',
  dumbbells: 'Гантели',
  barbell: 'Штанга',
  machine: 'Тренажёр',
  kettlebell: 'Гиря',
  bands: 'Резинки',
  bar: 'Турник / брусья',
};
export const LOCATIONS = { home: 'Дома', gym: 'В зале' } as const;
export const WORKOUT_TYPES = { strength: 'Силовая', cardio: 'Кардио', hiit: 'Интервальная', mobility: 'Мобильность' } as const;

export const formatDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Строка «a, b, c» → массив без пустых значений */
export const splitList = (s: string, sep: RegExp = /[,\n]/) =>
  s
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);
