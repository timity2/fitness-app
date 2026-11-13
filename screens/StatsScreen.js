
import { useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
} from '../constants/theme';

import Header from '../components/Header';
import Card from '../components/Card';
import useWorkoutStore from '../store/useWorkoutStore';

const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function StatsScreen() {
  const workouts = useWorkoutStore((state) => state.workouts);
  const isLoading = useWorkoutStore((state) => state.isLoading);
  const loadWorkouts = useWorkoutStore((state) => state.loadWorkouts);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();

      loadWorkouts(controller.signal);

      return () => {
        controller.abort();
      };
    }, [loadWorkouts])
  );

  const completedWorkouts = workouts.filter(
    (workout) => workout.status === 'completed'
  );

  const totalWorkouts = completedWorkouts.length;

  const totalMinutes = completedWorkouts.reduce(
    (total, workout) => total + (Number(workout.duration) || 0),
    0
  );

  const totalCalories = completedWorkouts.reduce(
    (total, workout) => total + (Number(workout.calories) || 0),
    0
  );

  const getCompletionDate = (workout) => {
    if (workout.completedAt) {
      return workout.completedAt;
    }

    const completion = [...(workout.statusHistory || [])]
      .reverse()
      .find((item) => item.status === 'completed');

    return completion?.date || null;
  };

  const getWeekActivity = () => {
    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay();

    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);

    return WEEK_DAYS.map((dayName, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);

      const count = workouts.filter((workout) => {
        const completionDate = getCompletionDate(workout);

        if (!completionDate) return false;

        return (
          new Date(completionDate).toDateString() ===
          date.toDateString()
        );
      }).length;

      return {
        day: dayName,
        count,
      };
    });
  };

  const weekActivity = getWeekActivity();

  const maxActivity = Math.max(
    1,
    ...weekActivity.map((item) => item.count)
  );

  const weeklyWorkouts = weekActivity.reduce(
    (total, item) => total + item.count,
    0
  );

  const weeklyGoal = 5;
  const progress = Math.min(weeklyWorkouts / weeklyGoal, 1) * 100;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title="STATISTICS"
        subtitle="TRACK YOUR PERFORMANCE"
      />

      <View style={styles.intro}>
        <View style={styles.sectionLabel}>
          <View style={styles.labelLine} />
          <Text style={styles.eyebrow}>YOUR PERFORMANCE</Text>
        </View>

        <Text style={styles.heading}>
          YOUR
          <Text style={styles.headingAccent}> OVERVIEW.</Text>
        </Text>

        <Text style={styles.description}>
          Every session counts. Keep showing up and getting stronger.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <Card style={[styles.statCard, styles.featuredStat]}>
          <View style={styles.statTopRow}>
            <Text style={styles.statIcon}>↗</Text>
            <Text style={styles.statIndex}>01</Text>
          </View>

          <Text style={styles.value}>{totalWorkouts}</Text>
          <Text style={styles.label}>TOTAL WORKOUTS</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statTopRow}>
            <Text style={styles.statIcon}>◷</Text>
            <Text style={styles.statIndex}>02</Text>
          </View>

          <Text style={styles.value}>{totalMinutes}</Text>
          <Text style={styles.label}>TOTAL MINUTES</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statTopRow}>
            <Text style={styles.statIcon}>✦</Text>
            <Text style={styles.statIndex}>03</Text>
          </View>

          <Text style={styles.value}>{totalCalories}</Text>
          <Text style={styles.label}>CALORIES</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statTopRow}>
            <Text style={styles.statIcon}>⚡</Text>
            <Text style={styles.statIndex}>04</Text>
          </View>

          <Text style={styles.value}>—</Text>
          <Text style={styles.label}>DAY STREAK</Text>
        </Card>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <View style={styles.sectionLabel}>
            <View style={styles.labelLine} />
            <Text style={styles.eyebrow}>THIS WEEK</Text>
          </View>

          <Text style={styles.sectionTitle}>WEEKLY ACTIVITY</Text>
        </View>

        <View style={styles.weekBadge}>
          <Text style={styles.weekBadgeText}>
            {weeklyWorkouts} SESSIONS
          </Text>
        </View>
      </View>

      <Card style={styles.chartCard}>
        <View style={styles.chartTop}>
          <View>
            <Text style={styles.chartCaption}>WORKOUT FREQUENCY</Text>
            <Text style={styles.chartTitle}>
              {weeklyWorkouts}{' '}
              <Text style={styles.chartTitleMuted}>this week</Text>
            </Text>
          </View>

          <View style={styles.chartLegend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>ACTIVITY</Text>
          </View>
        </View>

        {isLoading && totalWorkouts === 0 ? (
          <ActivityIndicator
            color={COLORS.primary}
            style={styles.loader}
          />
        ) : totalWorkouts === 0 ? (
          <Text style={styles.emptyText}>
            Complete your first workout to see your activity here.
          </Text>
        ) : (
          <View style={styles.chart}>
            {weekActivity.map((item) => (
              <View key={item.day} style={styles.barColumn}>
                <Text style={styles.barValue}>
                  {item.count > 0 ? item.count : ''}
                </Text>

                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(item.count / maxActivity) * 100}%`,
                        minHeight: item.count > 0 ? 8 : 0,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.day}>{item.day}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <View style={styles.sectionLabel}>
            <View style={styles.labelLine} />
            <Text style={styles.eyebrow}>KEEP PUSHING</Text>
          </View>

          <Text style={styles.sectionTitle}>PERSONAL GOALS</Text>
        </View>
      </View>

      <Card style={styles.goalCard}>
        <View style={styles.goalTop}>
          <View>
            <Text style={styles.goalCaption}>WEEKLY TARGET</Text>
            <Text style={styles.goalTitle}>WORKOUTS</Text>
          </View>

          <View style={styles.goalCircle}>
            <Text style={styles.goalPercent}>
              {Math.round(progress)}%
            </Text>
          </View>
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>YOUR PROGRESS</Text>

          <Text style={styles.goalValue}>
            {weeklyWorkouts} / {weeklyGoal}
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

        <View style={styles.goalFooter}>
          <Text style={styles.goalHint}>
            {weeklyWorkouts >= weeklyGoal
              ? 'Weekly goal completed. Great work!'
              : `${weeklyGoal - weeklyWorkouts} more workouts to reach your goal.`}
          </Text>

          <Text style={styles.goalEmoji}>⚡</Text>
        </View>
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
  intro: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
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
  heading: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.display,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginTop: SPACING.md,
  },
  headingAccent: {
    color: COLORS.primary,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 22,
    marginTop: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    minHeight: 145,
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  featuredStat: {
    borderColor: '#536D35',
    backgroundColor: '#192319',
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statIcon: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  statIndex: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
  },
  value: {
    color: COLORS.primary,
    fontSize: 34,
    fontWeight: '900',
    marginTop: SPACING.md,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: SPACING.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: SPACING.sm,
  },
  weekBadge: {
    backgroundColor: '#202B22',
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    marginBottom: 2,
  },
  weekBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  chartCard: {
    padding: SPACING.md,
  },
  chartTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  chartCaption: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  chartTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 5,
  },
  chartTitleMuted: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  legendText: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  chart: {
    height: 170,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barValue: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: SPACING.xs,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  day: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    marginTop: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SPACING.lg,
    lineHeight: 21,
  },
  loader: {
    padding: SPACING.lg,
  },
  goalCard: {
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalCaption: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  goalTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 5,
  },
  goalCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: '#202B22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalPercent: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  goalValue: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '900',
  },
  progressTrack: {
    height: 10,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalHint: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    flex: 1,
  },
  goalEmoji: {
    color: COLORS.primary,
    fontSize: 18,
    marginLeft: SPACING.sm,
  },
});
