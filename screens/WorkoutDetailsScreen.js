import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
} from '../constants/theme';

import Header from '../components/Header';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';

const EXERCISES = [
  { id: '1', name: 'PUSH-UPS', sets: '3 SETS', reps: '12 REPS' },
  { id: '2', name: 'SQUATS', sets: '3 SETS', reps: '15 REPS' },
  { id: '3', name: 'PLANK', sets: '3 SETS', reps: '30 SEC' },
  { id: '4', name: 'LUNGES', sets: '3 SETS', reps: '12 REPS' },
];

export default function WorkoutDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const workout = route.params?.workout || {
    title: 'FULL BODY',
    category: 'STRENGTH',
    duration: '45 MIN',
    level: 'INTERMEDIATE',
  };

  const startWorkout = () => {
    navigation.navigate('ActiveWorkout', { workout });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title={workout.title}
        subtitle="WORKOUT DETAILS"
      />

      <Card style={styles.summary}>
        <View style={styles.summaryTop}>
          <Badge title={workout.level} />

          <View style={styles.readyBadge}>
            <View style={styles.readyDot} />
            <Text style={styles.readyText}>READY</Text>
          </View>
        </View>

        <Text style={styles.heroEyebrow}>YOUR NEXT CHALLENGE</Text>

        <Text style={styles.workoutTitle}>
          {workout.title}
          <Text style={styles.titleAccent}>.</Text>
        </Text>

        <Text style={styles.description}>
          A complete workout designed to build strength and endurance.
        </Text>

        <View style={styles.summaryDivider} />

        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>DURATION</Text>
            <Text style={styles.infoValue}>{workout.duration}</Text>
          </View>

          <View style={styles.infoSeparator} />

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>EXERCISES</Text>
            <Text style={styles.infoValue}>
              {EXERCISES.length}
            </Text>
          </View>

          <View style={styles.infoSeparator} />

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>CATEGORY</Text>
            <Text style={styles.infoValueSmall}>
              {workout.category}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <View style={styles.sectionLabel}>
            <View style={styles.labelLine} />
            <Text style={styles.eyebrow}>YOUR ROUTINE</Text>
          </View>

          <Text style={styles.sectionTitle}>EXERCISES</Text>
        </View>

        <Text style={styles.exerciseCount}>
          0{EXERCISES.length} MOVES
        </Text>
      </View>

      <View style={styles.list}>
        {EXERCISES.map((exercise, index) => (
          <Card key={exercise.id} style={styles.exercise}>
            <View style={styles.exerciseNumber}>
              <Text style={styles.number}>
                {String(index + 1).padStart(2, '0')}
              </Text>
            </View>

            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>
                {exercise.name}
              </Text>

              <Text style={styles.exerciseMeta}>
                {exercise.sets}  •  {exercise.reps}
              </Text>
            </View>

            <View style={styles.exerciseArrow}>
              <Text style={styles.arrow}>↗</Text>
            </View>
          </Card>
        ))}
      </View>

      <View style={styles.bottomActions}>
        <Button
          title="START WORKOUT"
          onPress={startWorkout}
        />

        <Button
          title="BACK TO WORKOUTS"
          variant="secondary"
          onPress={() => navigation.goBack()}
        />
      </View>

      <Text style={styles.footerText}>
        STAY FOCUSED. KEEP MOVING.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 110,
  },
  summary: {
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: '#18221A',
    gap: SPACING.md,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  readyText: {
    color: COLORS.success,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroEyebrow: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: SPACING.md,
  },
  workoutTitle: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  titleAccent: {
    color: COLORS.primary,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 22,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoBlock: {
    flex: 1,
    gap: 6,
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  infoValue: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  infoValueSmall: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  infoSeparator: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  labelLine: {
    width: 22,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: SPACING.sm,
  },
  exerciseCount: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  list: {
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  exercise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  exerciseNumber: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: '#263322',
    borderWidth: 1,
    borderColor: '#3A4B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  exerciseInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  exerciseName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '900',
  },
  exerciseMeta: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  exerciseArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  bottomActions: {
    gap: SPACING.xs,
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});