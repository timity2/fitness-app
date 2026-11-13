import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { estimateTargets } from '@/lib/calc';
import { toISODate } from '@/lib/format';
import { supabase, unwrap } from '@/lib/supabase';
import { requireUid, useUid } from '@/store/auth';
import type { FitnessLevel, Gender, GoalType, Profile, UserGoal, UserSettings } from '@/types/db';

export function useProfile() {
  const uid = useUid();
  return useQuery({
    queryKey: ['profile', uid],
    enabled: !!uid,
    queryFn: () => unwrap<Profile | null>(supabase.from('profiles').select('*').eq('id', uid!).maybeSingle()),
  });
}

export function useGoal() {
  const uid = useUid();
  return useQuery({
    queryKey: ['goal', uid],
    enabled: !!uid,
    queryFn: () =>
      unwrap<UserGoal | null>(
        supabase.from('user_goals').select('*').eq('user_id', uid!).eq('is_active', true).maybeSingle(),
      ),
  });
}

export function useSettings() {
  const uid = useUid();
  return useQuery({
    queryKey: ['settings', uid],
    enabled: !!uid,
    queryFn: () => unwrap<UserSettings | null>(supabase.from('user_settings').select('*').eq('user_id', uid!).maybeSingle()),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<Profile, 'id' | 'is_blocked' | 'created_at' | 'updated_at'>>) =>
      unwrap<Profile>(supabase.from('profiles').update(patch).eq('id', requireUid()).select('*').single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<UserSettings, 'user_id'>>) =>
      unwrap<UserSettings>(
        supabase.from('user_settings').upsert({ user_id: requireUid(), ...patch }, { onConflict: 'user_id' }).select('*').single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export type GoalInput = Pick<UserGoal, 'goal_type' | 'workouts_per_week' | 'session_minutes' | 'preferred_days'> & {
  target_weight_kg?: number | null;
  start_weight_kg?: number | null;
};

async function saveGoal(input: GoalInput) {
  const uid = requireUid();
  const current = await unwrap<UserGoal | null>(
    supabase.from('user_goals').select('*').eq('user_id', uid).eq('is_active', true).maybeSingle(),
  );
  if (current) {
    return unwrap<UserGoal>(supabase.from('user_goals').update(input).eq('id', current.id).select('*').single());
  }
  return unwrap<UserGoal>(
    supabase.from('user_goals').insert({ user_id: uid, is_active: true, ...input }).select('*').single(),
  );
}

export function useSaveGoal() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: saveGoal, onSuccess: () => qc.invalidateQueries({ queryKey: ['goal'] }) });
}

export interface OnboardingData {
  birth_date: string | null;
  height_cm: number;
  weight_kg: number;
  gender: Gender | null;
  fitness_level: FitnessLevel;
  goal_type: GoalType;
  target_weight_kg: number | null;
  workouts_per_week: number;
  session_minutes: number;
  preferred_days: number[];
  injuries: string;
  exercise_restrictions: string;
  special_notes: string;
}

/** Сохраняет анкету: профиль, цель, ограничения, ориентировочные цели питания, первую запись веса. */
export function useSaveOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, isEdit }: { data: OnboardingData; isEdit: boolean }) => {
      const uid = requireUid();
      await saveGoal({
        goal_type: data.goal_type,
        workouts_per_week: data.workouts_per_week,
        session_minutes: data.session_minutes,
        preferred_days: data.preferred_days,
        target_weight_kg: data.target_weight_kg,
        ...(isEdit ? {} : { start_weight_kg: data.weight_kg }),
      });

      const current = await unwrap<UserSettings | null>(
        supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
      );
      const targets = estimateTargets({
        weightKg: data.weight_kg,
        heightCm: data.height_cm,
        birthDate: data.birth_date,
        gender: data.gender,
        workoutsPerWeek: data.workouts_per_week,
        goal: data.goal_type,
      });
      await unwrap(
        supabase.from('user_settings').upsert(
          {
            user_id: uid,
            injuries: data.injuries,
            exercise_restrictions: data.exercise_restrictions,
            special_notes: data.special_notes,
            // цели питания, заданные вручную, при правке анкеты не перезаписываются
            ...(current?.calorie_goal ? {} : targets),
          },
          { onConflict: 'user_id' },
        ),
      );

      if (!isEdit) {
        await unwrap(
          supabase.from('user_measurements').insert({ user_id: uid, measured_on: toISODate(), weight_kg: data.weight_kg }),
        );
      }

      return unwrap<Profile>(
        supabase
          .from('profiles')
          .update({
            birth_date: data.birth_date,
            height_cm: data.height_cm,
            weight_kg: data.weight_kg,
            gender: data.gender,
            fitness_level: data.fitness_level,
            onboarding_completed: true,
          })
          .eq('id', uid)
          .select('*')
          .single(),
      );
    },
    onSuccess: (profile) => {
      qc.setQueryData(['profile', profile.id], profile);
      qc.invalidateQueries();
    },
  });
}
