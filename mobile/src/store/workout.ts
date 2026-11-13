// Состояние интерактивной тренировки. Хранится на устройстве (переживает закрытие приложения)
// и дублируется в таблицу active_workouts — см. hooks/useActiveWorkoutSync.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface PlanExercise {
  exerciseId: string;
  categoryId: string | null;
  name: string;
  position: number;
  sets: number;
  reps: number;
  restSec: number;
}

export interface DoneSet {
  exerciseId: string;
  name: string;
  position: number;
  setNumber: number;
  weightKg: number;
  reps: number;
}

export interface RestTimer {
  /** момент окончания отдыха (мс) */
  endsAt: number;
  total: number;
  /** если отдых на паузе — сколько миллисекунд осталось */
  pausedLeft: number | null;
}

export interface ActiveWorkout {
  userId: string;
  programId: string | null;
  programName: string;
  startedAt: number;
  exercises: PlanExercise[];
  exIndex: number;
  /** номер текущего подхода в упражнении, с нуля */
  setIndex: number;
  done: DoneSet[];
  skipped: number;
  pausedAt: number | null;
  pausedMs: number;
  rest: RestTimer | null;
  /** все упражнения пройдены, осталось подтвердить завершение */
  completedAll: boolean;
}

interface WorkoutState {
  active: ActiveWorkout | null;
  start: (userId: string, programId: string | null, programName: string, exercises: PlanExercise[]) => void;
  hydrate: (w: ActiveWorkout | null) => void;
  completeSet: (weightKg: number, reps: number) => void;
  skipSet: () => void;
  nextExercise: () => void;
  goToExercise: (index: number) => void;
  togglePause: () => void;
  toggleRestPause: () => void;
  addRest: (sec: number) => void;
  skipRest: () => void;
  discard: () => void;
}

function advance(w: ActiveWorkout): ActiveWorkout {
  const ex = w.exercises[w.exIndex];
  if (w.setIndex + 1 < ex.sets) return { ...w, setIndex: w.setIndex + 1 };
  if (w.exIndex + 1 < w.exercises.length) return { ...w, exIndex: w.exIndex + 1, setIndex: 0 };
  return { ...w, completedAll: true };
}

export const useWorkout = create<WorkoutState>()(
  persist(
    (set) => {
      const update = (fn: (w: ActiveWorkout) => ActiveWorkout) =>
        set((s) => (s.active ? { active: fn(s.active) } : s));

      return {
        active: null,

        start: (userId, programId, programName, exercises) =>
          set({
            active: {
              userId,
              programId,
              programName,
              startedAt: Date.now(),
              exercises,
              exIndex: 0,
              setIndex: 0,
              done: [],
              skipped: 0,
              pausedAt: null,
              pausedMs: 0,
              rest: null,
              completedAll: false,
            },
          }),

        hydrate: (active) => set({ active }),

        completeSet: (weightKg, reps) =>
          update((w) => {
            const ex = w.exercises[w.exIndex];
            const done: DoneSet = {
              exerciseId: ex.exerciseId,
              name: ex.name,
              position: ex.position,
              setNumber: w.setIndex + 1,
              weightKg,
              reps,
            };
            const next = advance({ ...w, done: [...w.done, done] });
            const rest: RestTimer | null =
              ex.restSec > 0 && !next.completedAll
                ? { endsAt: Date.now() + ex.restSec * 1000, total: ex.restSec, pausedLeft: null }
                : null;
            return { ...next, rest };
          }),

        skipSet: () => update((w) => advance({ ...w, skipped: w.skipped + 1, rest: null })),

        nextExercise: () =>
          update((w) => {
            const ex = w.exercises[w.exIndex];
            const left = Math.max(0, ex.sets - w.setIndex);
            return w.exIndex + 1 < w.exercises.length
              ? { ...w, exIndex: w.exIndex + 1, setIndex: 0, skipped: w.skipped + left, rest: null }
              : { ...w, completedAll: true, skipped: w.skipped + left, rest: null };
          }),

        goToExercise: (index) =>
          update((w) => {
            if (index < 0 || index >= w.exercises.length) return w;
            const ex = w.exercises[index];
            const doneHere = w.done.filter((d) => d.position === ex.position).length;
            return { ...w, exIndex: index, setIndex: Math.min(doneHere, ex.sets - 1), completedAll: false, rest: null };
          }),

        togglePause: () =>
          update((w) => {
            const now = Date.now();
            if (w.pausedAt == null) {
              // пауза тренировки останавливает и таймер отдыха
              const rest = w.rest && w.rest.pausedLeft == null ? { ...w.rest, pausedLeft: Math.max(0, w.rest.endsAt - now) } : w.rest;
              return { ...w, pausedAt: now, rest };
            }
            const rest = w.rest && w.rest.pausedLeft != null ? { ...w.rest, endsAt: now + w.rest.pausedLeft, pausedLeft: null } : w.rest;
            return { ...w, pausedAt: null, pausedMs: w.pausedMs + (now - w.pausedAt), rest };
          }),

        toggleRestPause: () =>
          update((w) => {
            if (!w.rest) return w;
            const now = Date.now();
            return w.rest.pausedLeft == null
              ? { ...w, rest: { ...w.rest, pausedLeft: Math.max(0, w.rest.endsAt - now) } }
              : { ...w, rest: { ...w.rest, endsAt: now + w.rest.pausedLeft, pausedLeft: null } };
          }),

        addRest: (sec) =>
          update((w) => {
            if (!w.rest) return w;
            const ms = sec * 1000;
            return {
              ...w,
              rest: {
                total: w.rest.total + sec,
                endsAt: w.rest.endsAt + ms,
                pausedLeft: w.rest.pausedLeft == null ? null : w.rest.pausedLeft + ms,
              },
            };
          }),

        skipRest: () => update((w) => ({ ...w, rest: null })),

        discard: () => set({ active: null }),
      };
    },
    {
      name: 'pulse.active-workout.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ active: s.active }),
    },
  ),
);

/** Чистое время тренировки в секундах (без пауз) */
export const elapsedSec = (w: ActiveWorkout, now = Date.now()) =>
  Math.max(0, Math.floor(((w.pausedAt ?? now) - w.startedAt - w.pausedMs) / 1000));

/** Оставшееся время отдыха в секундах */
export const restLeftSec = (r: RestTimer, now = Date.now()) =>
  Math.max(0, Math.ceil((r.pausedLeft ?? r.endsAt - now) / 1000));

export const totalSets = (w: ActiveWorkout) => w.exercises.reduce((n, e) => n + e.sets, 0);
