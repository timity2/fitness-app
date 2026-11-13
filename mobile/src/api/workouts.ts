import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase, unwrap } from '@/lib/supabase';
import { requireUid, useUid } from '@/store/auth';
import type { ActiveWorkout, DoneSet } from '@/store/workout';
import type {
  Exercise,
  ExerciseCategory,
  PersonalRecord,
  UserProgram,
  WorkoutExercise,
  WorkoutProgram,
  WorkoutSession,
  WorkoutSet,
} from '@/types/db';

const HOUR = 1000 * 60 * 60;

// ---------- Каталог ----------
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    staleTime: HOUR,
    queryFn: () => unwrap<ExerciseCategory[]>(supabase.from('exercise_categories').select('*').order('sort_order')),
  });
}

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    staleTime: HOUR,
    queryFn: () => unwrap<Exercise[]>(supabase.from('exercises').select('*').order('name')),
  });
}

export function useExercise(id: string | undefined) {
  return useQuery({
    queryKey: ['exercise', id],
    enabled: !!id,
    staleTime: HOUR,
    queryFn: () => unwrap<Exercise | null>(supabase.from('exercises').select('*').eq('id', id!).maybeSingle()),
  });
}

export function usePrograms() {
  const uid = useUid();
  return useQuery({
    queryKey: ['programs', uid],
    staleTime: 5 * 60_000,
    queryFn: () => unwrap<WorkoutProgram[]>(supabase.from('workout_programs').select('*').order('name')),
  });
}

/** Количество упражнений в каждой программе: { [program_id]: n } */
export function useProgramExerciseCounts() {
  const uid = useUid();
  return useQuery({
    queryKey: ['program-exercise-counts', uid],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const rows = await unwrap<Pick<WorkoutExercise, 'program_id' | 'sets' | 'exercise_id'>[]>(
        supabase.from('workout_exercises').select('program_id, sets, exercise_id'),
      );
      const map: Record<string, { exercises: number; sets: number; exerciseIds: string[] }> = {};
      for (const r of rows) {
        const m = (map[r.program_id] ??= { exercises: 0, sets: 0, exerciseIds: [] });
        m.exercises += 1;
        m.sets += r.sets;
        m.exerciseIds.push(r.exercise_id);
      }
      return map;
    },
  });
}

export type ProgramItem = WorkoutExercise & { exercise: Exercise };
export interface ProgramDetails {
  program: WorkoutProgram;
  items: ProgramItem[];
}

export async function fetchProgramDetails(id: string): Promise<ProgramDetails | null> {
  const program = await unwrap<WorkoutProgram | null>(supabase.from('workout_programs').select('*').eq('id', id).maybeSingle());
  if (!program) return null;
  const rows = await unwrap<WorkoutExercise[]>(
    supabase.from('workout_exercises').select('*').eq('program_id', id).order('position'),
  );
  const exercises = rows.length
    ? await unwrap<Exercise[]>(supabase.from('exercises').select('*').in('id', rows.map((r) => r.exercise_id)))
    : [];
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const items = rows.flatMap((r) => {
    const exercise = byId.get(r.exercise_id);
    return exercise ? [{ ...r, exercise }] : [];
  });
  return { program, items };
}

export function useProgramDetails(id: string | undefined) {
  return useQuery({
    queryKey: ['program', id],
    enabled: !!id,
    queryFn: () => fetchProgramDetails(id!),
  });
}

// ---------- Программы пользователя ----------
export function useUserPrograms() {
  const uid = useUid();
  return useQuery({
    queryKey: ['user-programs', uid],
    enabled: !!uid,
    queryFn: () => unwrap<UserProgram[]>(supabase.from('user_programs').select('*').eq('user_id', uid!).order('added_at')),
  });
}

export function useToggleUserProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ programId, add }: { programId: string; add: boolean }) => {
      const uid = requireUid();
      if (add) {
        await unwrap(
          supabase
            .from('user_programs')
            .upsert({ user_id: uid, program_id: programId, added_at: new Date().toISOString() }, { onConflict: 'user_id,program_id' }),
        );
      } else {
        await unwrap(supabase.from('user_programs').delete().eq('user_id', uid).eq('program_id', programId));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-programs'] }),
  });
}

/** Делает программу активной (она показывается на главной как «Продолжить программу») */
export function useSetActiveProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (programId: string) => {
      const uid = requireUid();
      await unwrap(supabase.from('user_programs').update({ is_active: false }).eq('user_id', uid).eq('is_active', true));
      await unwrap(
        supabase
          .from('user_programs')
          .upsert(
            { user_id: uid, program_id: programId, is_active: true, added_at: new Date().toISOString() },
            { onConflict: 'user_id,program_id' },
          ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-programs'] }),
  });
}

// ---------- История, рекорды ----------
export function useSessions() {
  const uid = useUid();
  return useQuery({
    queryKey: ['sessions', uid],
    enabled: !!uid,
    queryFn: () =>
      unwrap<WorkoutSession[]>(
        supabase.from('workout_sessions').select('*').eq('user_id', uid!).order('finished_at', { ascending: false }),
      ),
  });
}

export function useSessionDetails(id: string | undefined) {
  const uid = useUid();
  return useQuery({
    queryKey: ['session', uid, id],
    enabled: !!id && !!uid,
    queryFn: async () => {
      const session = await unwrap<WorkoutSession | null>(
        supabase.from('workout_sessions').select('*').eq('id', id!).maybeSingle(),
      );
      if (!session) return null;
      const sets = await unwrap<WorkoutSet[]>(
        supabase.from('workout_sets').select('*').eq('session_id', id!).order('exercise_position').order('set_number'),
      );
      return { session, sets };
    },
  });
}

/** Все выполненные подходы пользователя — для графиков силовых показателей */
export function useAllSets() {
  const uid = useUid();
  return useQuery({
    queryKey: ['sets', uid],
    enabled: !!uid,
    queryFn: () => unwrap<WorkoutSet[]>(supabase.from('workout_sets').select('*').eq('user_id', uid!).order('completed_at')),
  });
}

export function useRecords() {
  const uid = useUid();
  return useQuery({
    queryKey: ['records', uid],
    enabled: !!uid,
    queryFn: () =>
      unwrap<PersonalRecord[]>(
        supabase.from('personal_records').select('*').eq('user_id', uid!).order('achieved_at', { ascending: false }),
      ),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(supabase.from('workout_sessions').delete().eq('id', id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['sets'] });
    },
  });
}

/** Сохраняет завершённую тренировку; итоги, рекорды и достижения считает сервер. */
export function useFinishWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workout, durationSec }: { workout: ActiveWorkout; durationSec: number }) =>
      unwrap<string>(
        supabase.rpc('finish_workout', {
          p_program_id: workout.programId,
          p_program_name: workout.programName,
          p_started_at: new Date(workout.startedAt).toISOString(),
          p_finished_at: new Date().toISOString(),
          p_duration_sec: durationSec,
          p_sets: workout.done.map((d: DoneSet) => ({
            exercise_id: d.exerciseId,
            exercise_name: d.name,
            exercise_position: d.position,
            set_number: d.setNumber,
            weight_kg: d.weightKg,
            reps: d.reps,
          })),
        }),
      ),
    onSuccess: () => {
      for (const key of ['sessions', 'sets', 'records', 'user-achievements', 'notifications']) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

// ---------- Незавершённая тренировка (серверная копия) ----------
export async function saveRemoteActiveWorkout(w: ActiveWorkout | null) {
  const uid = requireUid();
  if (!w) {
    await unwrap(supabase.from('active_workouts').delete().eq('user_id', uid));
    return;
  }
  await unwrap(
    supabase
      .from('active_workouts')
      .upsert({ user_id: uid, program_id: w.programId, state: w, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
  );
}

export async function loadRemoteActiveWorkout(): Promise<ActiveWorkout | null> {
  const row = await unwrap<{ state: ActiveWorkout } | null>(
    supabase.from('active_workouts').select('*').eq('user_id', requireUid()).maybeSingle(),
  );
  return row?.state ?? null;
}
