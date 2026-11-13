// Типы строк базы данных (соответствуют supabase/migrations/*_init.sql)

export type GoalType = 'muscle_gain' | 'weight_loss' | 'maintenance' | 'strength' | 'endurance';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type Gender = 'male' | 'female' | 'other';
export type UnitSystem = 'metric' | 'imperial';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Equipment = 'none' | 'dumbbells' | 'barbell' | 'machine' | 'kettlebell' | 'bands' | 'bar';
export type WorkoutLocation = 'home' | 'gym';
export type WorkoutType = 'strength' | 'cardio' | 'hiit' | 'mobility';
export type NotificationType = 'workout' | 'nutrition' | 'water' | 'goal' | 'achievement' | 'system';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  birth_date: string | null;
  gender: Gender | null;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_level: FitnessLevel | null;
  onboarding_completed: boolean;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserGoal {
  id: string;
  user_id: string;
  goal_type: GoalType;
  start_weight_kg: number | null;
  target_weight_kg: number | null;
  workouts_per_week: number;
  session_minutes: number;
  preferred_days: number[];
  is_active: boolean;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  unit_system: UnitSystem;
  language: 'ru' | 'en';
  injuries: string;
  exercise_restrictions: string;
  special_notes: string;
  calorie_goal: number | null;
  protein_goal_g: number | null;
  fat_goal_g: number | null;
  carbs_goal_g: number | null;
  water_goal_ml: number;
  timer_sound: boolean;
  timer_vibration: boolean;
}

export interface Measurement {
  id: string;
  user_id: string;
  measured_on: string;
  weight_kg: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  arm_cm: number | null;
  leg_cm: number | null;
  created_at: string;
}

export interface ProgressPhoto {
  id: string;
  user_id: string;
  storage_path: string;
  taken_on: string;
  note: string;
  created_at: string;
}

export interface ExerciseCategory {
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
  equipment: Equipment;
  difficulty: FitnessLevel;
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

export interface WorkoutProgram {
  id: string;
  owner_id: string | null;
  category_id: string | null;
  name: string;
  description: string;
  goal_type: GoalType | null;
  difficulty: FitnessLevel;
  duration_min: number;
  location: WorkoutLocation;
  workout_type: WorkoutType;
  target_muscles: string[];
  image_url: string | null;
  is_demo: boolean;
  is_published: boolean;
}

export interface WorkoutExercise {
  id: string;
  program_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  reps: number;
  rest_sec: number;
}

export interface UserProgram {
  user_id: string;
  program_id: string;
  is_active: boolean;
  added_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  program_id: string | null;
  program_name: string;
  started_at: string;
  finished_at: string;
  duration_sec: number;
  exercises_count: number;
  sets_count: number;
  total_volume_kg: number;
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  user_id: string;
  exercise_id: string | null;
  exercise_name: string;
  exercise_position: number;
  set_number: number;
  weight_kg: number;
  reps: number;
  is_pr: boolean;
  completed_at: string;
}

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  session_id: string | null;
  achieved_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  condition_type: 'workouts_total' | 'first_pr' | 'streak_days';
  threshold: number;
  sort_order: number;
}

export interface UserAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface FoodProduct {
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
  is_demo: boolean;
}

export interface NutritionEntry {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  entry_date: string;
  meal_type: MealType;
  grams: number;
  kcal_100: number;
  protein_100: number;
  fat_100: number;
  carbs_100: number;
  created_at: string;
}

export interface WaterEntry {
  id: string;
  user_id: string;
  entry_date: string;
  amount_ml: number;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  enabled: boolean;
  workout_enabled: boolean;
  workout_time: string;
  nutrition_enabled: boolean;
  nutrition_time: string;
  water_enabled: boolean;
  water_time: string;
  goal_enabled: boolean;
  goal_time: string;
  achievement_enabled: boolean;
  system_enabled: boolean;
}
