import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import mockWorkouts from './mockWorkouts';

const useWorkoutStore = create(
  persist(
    (set, get) => ({
      workouts: [],
      isLoading: false,
      error: null,

      // Загрузка тренировок
      loadWorkouts: async () => {
        set({ isLoading: true, error: null });

        try {
          // Имитация загрузки с сервера
          await new Promise((resolve) => setTimeout(resolve, 500));

          const currentWorkouts = get().workouts;

          // Если тренировок ещё нет, загружаем тестовые
          if (currentWorkouts.length === 0) {
            set({ workouts: mockWorkouts });
          }

          set({ isLoading: false });

          return get().workouts;
        } catch (error) {
          set({
            isLoading: false,
            error: error.message || 'Не удалось загрузить тренировки',
          });

          return [];
        }
      },

      // Добавление тренировки
      addWorkout: async (workout) => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));

          const newWorkout = {
            ...workout,
            id: workout.id || `workout-${Date.now()}`,
            status: workout.status || 'pending',
            createdAt: new Date().toISOString(),
            statusHistory: workout.statusHistory || [
              {
                status: workout.status || 'pending',
                date: new Date().toISOString(),
              },
            ],
          };

          set((state) => ({
            workouts: [newWorkout, ...state.workouts],
          }));

          return newWorkout;
        } catch (error) {
          set({ error: error.message });
          return null;
        }
      },

      // Обновление тренировки
      updateWorkout: async (id, updates) => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));

          set((state) => ({
            workouts: state.workouts.map((workout) => {
              if (workout.id !== id) {
                return workout;
              }

              const updatedWorkout = {
                ...workout,
                ...updates,
              };

              // Сохраняем историю изменения статуса
              if (
                updates.status &&
                updates.status !== workout.status
              ) {
                updatedWorkout.statusHistory = [
                  ...(workout.statusHistory || []),
                  {
                    status: updates.status,
                    date: new Date().toISOString(),
                  },
                ];
              }

              return updatedWorkout;
            }),
          }));

          return get().workouts.find((workout) => workout.id === id);
        } catch (error) {
          set({ error: error.message });
          return null;
        }
      },

      // Удаление тренировки
      deleteWorkout: async (id) => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));

          set((state) => ({
            workouts: state.workouts.filter(
              (workout) => workout.id !== id
            ),
          }));

          return true;
        } catch (error) {
          set({ error: error.message });
          return false;
        }
      },

      // Очистка списка
      clearWorkouts: () => {
        set({ workouts: [] });
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