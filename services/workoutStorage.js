import AsyncStorage from '@react-native-async-storage/async-storage';

const WORKOUTS_KEY = '@fitness_workouts';

export async function getWorkouts() {
  try {
    const data = await AsyncStorage.getItem(WORKOUTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
}

export async function saveWorkout(workout) {
  try {
    const workouts = await getWorkouts();

    workouts.push({
      ...workout,
      completedAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem(
      WORKOUTS_KEY,
      JSON.stringify(workouts)
    );

    return true;
  } catch (error) {
    return false;
  }
}

export async function clearWorkouts() {
  try {
    await AsyncStorage.removeItem(WORKOUTS_KEY);
    return true;
  } catch (error) {
    return false;
  }
}