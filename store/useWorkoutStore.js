
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchWorkouts } from '../services/workoutApi';

let latestLoadRequest = 0;

const useWorkoutStore = create(
  persist(
    (set, get) => ({
      workouts: [],
      isLoading: false,
      error: null,

      // Загрузка тренировок с REST API
      loadWorkouts: async (signal) => {
        const requestId = ++latestLoadRequest;
        set({ isLoading: true, error: null });

        try {
          const apiWorkouts = await fetchWorkouts(signal);

          if (signal?.aborted || requestId !== latestLoadRequest) {
            return get().workouts;
          }

          const currentWorkouts = get().workouts;

          // Убираем серверные записи предыдущей загрузки и старые mock-данные.
          // Пользовательские записи с id workout-<timestamp> сохраняются.
          const localWorkouts = currentWorkouts.filter((workout) => {
            const id = String(workout.id);
            return !id.startsWith('api-') && !/^workout-\d{3}$/.test(id);
          });

          const previousApiWorkouts = new Map(
            currentWorkouts
              .filter((workout) => String(workout.id).startsWith('api-'))
              .map((workout) => [String(workout.id), workout])
          );

          const refreshedApiWorkouts = apiWorkouts.map((workout) => {
            const previous = previousApiWorkouts.get(String(workout.id));

            return {
              ...workout,
              ...(previous
                ? {
                    status: previous.status || workout.status,
                    statusHistory: previous.statusHistory || [],
                  }
                : {}),
            };
          });

          const preparedWorkouts = [
            ...localWorkouts,
            ...refreshedApiWorkouts,
          ].map((workout) => ({
            ...workout,
            status: workout.status || 'pending',
            statusHistory:
              workout.statusHistory?.length > 0
                ? workout.statusHistory
                : [
                    {
                      status: workout.status || 'pending',
                      date: workout.createdAt || new Date().toISOString(),
                    },
                  ],
          }));

          if (requestId === latestLoadRequest && !signal?.aborted) {
            set({ workouts: preparedWorkouts, error: null });
          }

          return preparedWorkouts;
        } catch (error) {
          if (error.name === 'AbortError') {
            return get().workouts;
          }

          if (requestId === latestLoadRequest) {
            set({
              error: error.message || 'Не удалось загрузить тренировки',
            });
          }

          return get().workouts;
        } finally {
          if (requestId === latestLoadRequest) {
            set({ isLoading: false });
          }
        }
      },

      // Добавление тренировки
      addWorkout: async (workout) => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));

          const now = new Date().toISOString();
          const initialStatus = workout.status || 'pending';

          const newWorkout = {
            ...workout,
            id: workout.id || `workout-${Date.now()}`,
            status: initialStatus,
            createdAt: workout.createdAt || now,
            statusHistory: workout.statusHistory || [
              {
                status: initialStatus,
                date: now,
              },
            ],
          };

          set((state) => ({
            workouts: [newWorkout, ...state.workouts],
            error: null,
          }));

          return newWorkout;
        } catch (error) {
          set({
            error: error.message || 'Не удалось добавить тренировку',
          });

          return null;
        }
      },

      // Обновление тренировки
      updateWorkout: async (id, updates) => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));

          const existingWorkout = get().workouts.find(
            (workout) => workout.id === id
          );

          if (!existingWorkout) {
            set({ error: 'Тренировка не найдена' });
            return null;
          }

          const now = new Date().toISOString();

          set((state) => ({
            workouts: state.workouts.map((workout) => {
              if (workout.id !== id) {
                return workout;
              }

              const updatedWorkout = {
                ...workout,
                ...updates,
              };

              if (
                updates.status &&
                updates.status !== workout.status
              ) {
                updatedWorkout.statusHistory = [
                  ...(workout.statusHistory || []),
                  {
                    status: updates.status,
                    date: now,
                  },
                ];
              }

              return updatedWorkout;
            }),
            error: null,
          }));

          return get().workouts.find(
            (workout) => workout.id === id
          ) || null;
        } catch (error) {
          set({
            error: error.message || 'Не удалось обновить тренировку',
          });

          return null;
        }
      },

      // Удаление тренировки
      deleteWorkout: async (id) => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));

          const exists = get().workouts.some(
            (workout) => workout.id === id
          );

          if (!exists) {
            set({ error: 'Тренировка не найдена' });
            return false;
          }

          set((state) => ({
            workouts: state.workouts.filter(
              (workout) => workout.id !== id
            ),
            error: null,
          }));

          return true;
        } catch (error) {
          set({
            error: error.message || 'Не удалось удалить тренировку',
          });

          return false;
        }
      },

      // Очистка списка
      clearWorkouts: () => {
        set({
          workouts: [],
          error: null,
        });
      },

      // Сброс ошибки
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'pulse-workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useWorkoutStore;
