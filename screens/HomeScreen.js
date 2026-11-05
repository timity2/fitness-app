
import { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

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

import { getUser } from '../services/userStorage';
import { getWorkouts } from '../services/workoutStorage';

const WEEKLY_GOAL = 5;

export default function HomeScreen() {
  const navigation = useNavigation();

  const [userName, setUserName] = useState('ATHLETE');
  const [workouts, setWorkouts] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadData() {
        const [user, savedWorkouts] = await Promise.all([
          getUser(),
          getWorkouts(),
        ]);

        if (!active) return;

        if (user?.name) {
          setUserName(user.name.toUpperCase());
        }

        setWorkouts(savedWorkouts);
      }

      loadData();

      return () => {
        active = false;
      };
    }, [])
  );

  const totalMinutes = Math.floor(
    workouts.reduce(
      (total, workout) =>
        total + (workout.durationSeconds || 0),
      0
    ) / 60
  );

  const totalWorkouts = workouts.length;

  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay();

  monday.setDate(
    monday.getDate() - (day === 0 ? 6 : day - 1)
  );
  monday.setHours(0, 0, 0, 0);

  const weeklyWorkouts = workouts.filter((workout) => {
    if (!workout.completedAt) return false;

    const completedDate = new Date(workout.completedAt);

    return completedDate >= monday && completedDate <= now;
  }).length;

  const progress = Math.min(
    (weeklyWorkouts / WEEKLY_GOAL) * 100,
    100
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title="FITNESS"
        subtitle="YOUR PERSONAL FITNESS SPACE"
      />

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.welcome}>WELCOME BACK</Text>
            <Text style={styles.name}>{userName}</Text>
          </View>
          <View style={styles.heroMark}>
            <Text style={styles.heroMarkText}>F</Text>
          </View>
        </View>

        <View style={styles.heroBottom}>
          <Badge title="READY TO TRAIN" />
          <Text style={styles.heroCaption}>
            SHOW UP. GET STRONGER.
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>YOUR ACTIVITY</Text>
        <Text style={styles.sectionCaption}>ALL TIME</Text>
      </View>

      <View style={styles.stats}>
        <Card style={styles.statCard}>
          <Text style={styles.statIcon}>◷</Text>
          <Text style={styles.statValue}>{totalMinutes}</Text>
          <Text style={styles.statLabel}>MINUTES</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statIcon}>⚡</Text>
          <Text style={styles.statValue}>—</Text>
          <Text style={styles.statLabel}>CALORIES</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statIcon}>↗</Text>
          <Text style={styles.statValue}>{totalWorkouts}</Text>
          <Text style={styles.statLabel}>WORKOUTS</Text>
        </Card>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>YOUR PROGRESS</Text>
        <Text style={styles.sectionCaption}>THIS WEEK</Text>
      </View>

      <Card style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View>
            <Text style={styles.progressTitle}>WEEKLY GOAL</Text>
            <Text style={styles.progressSubtitle}>
              BUILD YOUR CONSISTENCY
            </Text>
          </View>

          <View style={styles.progressCircle}>
            <Text style={styles.progressPercent}>
              {Math.round(progress)}%
            </Text>
          </View>
        </View>

        <View style={styles.progressNumbers}>
          <Text style={styles.progressValue}>
            {weeklyWorkouts}
            <Text style={styles.progressTotal}> / {WEEKLY_GOAL}</Text>
          </Text>
          <Text style={styles.progressUnit}>WORKOUTS</Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%` },
            ]}
          />
        </View>

        <Text style={styles.progressHint}>
          {weeklyWorkouts >= WEEKLY_GOAL
            ? 'Weekly goal completed. Great work!'
            : `${WEEKLY_GOAL - weeklyWorkouts} more workouts to reach your goal.`}
        </Text>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>RECOMMENDED</Text>
        <Text style={styles.sectionCaption}>FOR YOU</Text>
      </View>

      <Card style={styles.workoutCard}>
        <View style={styles.workoutTop}>
          <View style={styles.workoutTag}>
            <Text style={styles.workoutTagText}>FEATURED WORKOUT</Text>
          </View>
          <Text style={styles.workoutSymbol}>✦</Text>
        </View>

        <Text style={styles.workoutTitle}>
          FULL BODY{'\n'}
          <Text style={styles.workoutTitleAccent}>TRAINING.</Text>
        </Text>

        <Text style={styles.workoutDescription}>
          Build strength with a complete body workout.
        </Text>

        <Button
          title="START WORKOUT"
          onPress={() => navigation.navigate('WorkoutDetails')}
        />
      </Card>
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
  hero: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
    minHeight: 190,
    justifyContent: 'space-between',
    backgroundColor: '#17221A',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#354B32',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: SPACING.sm,
  },
  name: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroMark: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  heroMarkText: {
    color: '#080B09',
    fontSize: 34,
    fontWeight: '900',
  },
  heroBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  heroCaption: {
    color: '#91A092',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  sectionCaption: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  stats: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    minHeight: 112,
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141B16',
  },
  statIcon: {
    color: COLORS.primary,
    fontSize: 18,
    marginBottom: SPACING.xs,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '900',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: SPACING.xs,
  },
  progressCard: {
    backgroundColor: '#141B16',
    borderColor: '#354B32',
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  progressSubtitle: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: SPACING.xs,
  },
  progressCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  progressNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: SPACING.lg,
  },
  progressValue: {
    color: COLORS.primary,
    fontSize: 34,
    fontWeight: '900',
  },
  progressTotal: {
    color: COLORS.muted,
    fontSize: 22,
  },
  progressUnit: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    marginLeft: SPACING.sm,
    letterSpacing: 1,
  },
  progressTrack: {
    height: 9,
    backgroundColor: '#29372B',
    borderRadius: RADIUS.round,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
  },
  progressHint: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    marginTop: SPACING.md,
  },
  workoutCard: {
    backgroundColor: '#17221A',
    borderColor: '#354B32',
  },
  workoutTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutTag: {
    backgroundColor: '#293C2A',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
  },
  workoutTagText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  workoutSymbol: {
    color: COLORS.primary,
    fontSize: 25,
  },
  workoutTitle: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 34,
    marginTop: SPACING.lg,
    letterSpacing: -0.5,
  },
  workoutTitleAccent: {
    color: COLORS.primary,
  },
  workoutDescription: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
    marginVertical: SPACING.md,
  },
});
