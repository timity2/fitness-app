
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
} from '../constants/theme';

import Button from '../components/Button';
import Card from '../components/Card';
import useWorkoutStore from '../store/useWorkoutStore';

const EXERCISES = [
  { name: 'PUSH-UPS', sets: 3, reps: '12 REPS' },
  { name: 'SQUATS', sets: 3, reps: '15 REPS' },
  { name: 'PLANK', sets: 3, reps: '30 SEC' },
  { name: 'LUNGES', sets: 3, reps: '12 REPS' },
];

export default function ActiveWorkoutScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const updateWorkout = useWorkoutStore((state) => state.updateWorkout);
  const addWorkout = useWorkoutStore((state) => state.addWorkout);

  const workout = route.params?.workout || {
    title: 'FULL BODY',
    name: 'FULL BODY',
    duration: 45,
    category: 'STRENGTH',
    level: 'INTERMEDIATE',
    exercises: EXERCISES,
  };

  const [currentExercise, setCurrentExercise] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let interval;

    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(
      remainingSeconds
    ).padStart(2, '0')}`;
  };

  const nextExercise = () => {
    if (currentExercise < EXERCISES.length - 1) {
      setCurrentExercise((prev) => prev + 1);
    }
  };

  const previousExercise = () => {
    if (currentExercise > 0) {
      setCurrentExercise((prev) => prev - 1);
    }
  };

  const finishWorkout = async () => {
    if (isSaving) return;

    setIsRunning(false);
    setIsSaving(true);

    const completedAt = new Date().toISOString();
    const durationMinutes = Math.max(1, Math.ceil(seconds / 60));
    const workoutData = {
      name: workout.name || workout.title || 'Тренировка',
      category: workout.category || 'Общая',
      level: workout.level || 'Начальный',
      duration: durationMinutes,
      calories: workout.calories || 0,
      status: 'completed',
      completedAt,
      exercisesCompleted: currentExercise + 1,
    };

    let result;

    try {
      if (workout.id) {
        result = await updateWorkout(workout.id, {
          ...workoutData,
          statusHistory: [
            ...(workout.statusHistory || []),
            { status: 'completed', date: completedAt },
          ],
        });
      } else {
        result = await addWorkout({
          ...workoutData,
          priority: 'medium',
          exercises: workout.exercises || EXERCISES,
          trainer: null,
          location: null,
          image: null,
        });
      }
    } catch (error) {
      result = null;
    }

    setIsSaving(false);

    if (result) {
      Alert.alert(
        'GREAT WORK!',
        `Workout completed in ${formatTime(seconds)}.`,
        [
          {
            text: 'CONTINUE',
            onPress: () => navigation.popToTop(),
          },
        ]
      );
    } else {
      Alert.alert(
        'ERROR',
        'Could not save your workout. Please try again.'
      );
      setIsRunning(true);
    }
  };

  const exercise = EXERCISES[currentExercise];
  const progress = ((currentExercise + 1) / EXERCISES.length) * 100;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.header}>WORKOUT IN PROGRESS</Text>
        </View>

        <Text style={styles.category}>{workout.category}</Text>
      </View>

      <Text style={styles.workoutTitle}>{workout.title}</Text>
      <Text style={styles.subtitle}>STAY FOCUSED. KEEP MOVING.</Text>

      <Card style={styles.timerCard}>
        <Text style={styles.timerLabel}>ELAPSED TIME</Text>

        <Text style={styles.timer}>{formatTime(seconds)}</Text>

        <View style={styles.timerDivider} />

        <View style={styles.timerFooter}>
          <View>
            <Text style={styles.smallLabel}>STATUS</Text>
            <Text style={styles.status}>
              {isRunning ? 'IN PROGRESS' : 'PAUSED'}
            </Text>
          </View>

          <Button
            title={isRunning ? 'PAUSE' : 'RESUME'}
            variant="secondary"
            onPress={() => setIsRunning((prev) => !prev)}
          />
        </View>
      </Card>

      <View style={styles.progressHeader}>
        <Text style={styles.sectionTitle}>YOUR PROGRESS</Text>
        <Text style={styles.progressCount}>
          {currentExercise + 1} / {EXERCISES.length}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress}%` },
          ]}
        />
      </View>

      <View style={styles.exerciseHeading}>
        <Text style={styles.sectionTitle}>CURRENT EXERCISE</Text>
        <Text style={styles.exerciseIndex}>
          STEP {String(currentExercise + 1).padStart(2, '0')}
        </Text>
      </View>

      <Card style={styles.exerciseCard}>
        <View style={styles.exerciseTop}>
          <Text style={styles.exerciseNumber}>
            EXERCISE {currentExercise + 1}
          </Text>
          <View style={styles.exerciseDot} />
        </View>

        <Text style={styles.exerciseName}>{exercise.name}</Text>

        <View style={styles.exerciseDivider} />

        <View style={styles.exerciseStats}>
          <View style={styles.exerciseStat}>
            <Text style={styles.statValue}>{exercise.sets}</Text>
            <Text style={styles.statLabel}>SETS</Text>
          </View>

          <View style={styles.statSeparator} />

          <View style={styles.exerciseStat}>
            <Text style={styles.statValue}>{exercise.reps}</Text>
            <Text style={styles.statLabel}>TARGET</Text>
          </View>
        </View>
      </Card>

      <View style={styles.navigation}>
        <View style={styles.navButton}>
          <Button
            title="PREVIOUS"
            variant="secondary"
            disabled={currentExercise === 0}
            onPress={previousExercise}
          />
        </View>

        <View style={styles.navButton}>
          <Button
            title="NEXT"
            onPress={nextExercise}
            disabled={currentExercise === EXERCISES.length - 1}
          />
        </View>
      </View>

      <View style={styles.bottom}>
        <Button
          title={isSaving ? 'SAVING...' : 'FINISH WORKOUT'}
          onPress={finishWorkout}
          disabled={isSaving}
        />

        <Text
          style={styles.exit}
          onPress={() => navigation.goBack()}
        >
          EXIT WORKOUT
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primary,
  },
  header: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.small,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  category: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  workoutTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.heading,
    fontWeight: '900',
    marginTop: SPACING.lg,
    letterSpacing: -1,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: TYPOGRAPHY.small,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: SPACING.xs,
  },
  timerCard: {
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderColor: COLORS.border,
  },
  timerLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    fontWeight: '900',
    letterSpacing: 2,
  },
  timer: {
    color: COLORS.primary,
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: 2,
    marginVertical: SPACING.md,
    fontVariant: ['tabular-nums'],
  },
  timerDivider: {
    height: 1,
    width: '100%',
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  timerFooter: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  status: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.small,
    fontWeight: '900',
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.small,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  progressCount: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.small,
    fontWeight: '900',
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
  },
  exerciseHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  exerciseIndex: {
    color: COLORS.muted,
    fontSize: TYPOGRAPHY.small,
    fontWeight: '900',
  },
  exerciseCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    borderColor: COLORS.border,
  },
  exerciseTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseNumber: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  exerciseDot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primary,
  },
  exerciseName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.heading,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: SPACING.xl,
    letterSpacing: 1,
  },
  exerciseDivider: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.border,
  },
  exerciseStats: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: SPACING.lg,
  },
  exerciseStat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '900',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: SPACING.xs,
  },
  statSeparator: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  navigation: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  navButton: {
    flex: 1,
  },
  bottom: {
    marginTop: SPACING.xl,
  },
  exit: {
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.small,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: SPACING.lg,
    padding: SPACING.sm,
  },
});
