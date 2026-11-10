
import { useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';

import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
} from '../constants/theme';

import Header from '../components/Header';
import Card from '../components/Card';
import Badge from '../components/Badge';
import StatusBadge from '../components/ui/StatusBadge';
import AppButton from '../components/ui/AppButton';
import useWorkoutStore from '../store/useWorkoutStore';

const CATEGORY_ACCENTS = {
  'Силовая': '#B7FF36',
  'Кардио': '#FFB45E',
  'Йога': '#9EABFF',
  'Растяжка': '#70D9A0',
  'Пилатес': '#D6A5FF',
  'Функциональная': '#70D9A0',
};

export default function WorkoutsScreen() {
  const navigation = useNavigation();

  const workouts = useWorkoutStore((state) => state.workouts);
  const isLoading = useWorkoutStore((state) => state.isLoading);
  const error = useWorkoutStore((state) => state.error);
  const loadWorkouts = useWorkoutStore((state) => state.loadWorkouts);
  const clearError = useWorkoutStore((state) => state.clearError);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [loadWorkouts])
  );

  const completedWorkouts = [...workouts]
    .filter((workout) => workout.status === 'completed')
    .sort((a, b) => {
      const dateA = new Date(
        [...(a.statusHistory || [])]
          .reverse()
          .find((item) => item.status === 'completed')?.date ||
          a.createdAt
      );

      const dateB = new Date(
        [...(b.statusHistory || [])]
          .reverse()
          .find((item) => item.status === 'completed')?.date ||
          b.createdAt
      );

      return dateB - dateA;
    })
    .slice(0, 5);

  const openWorkout = (workout) => {
    navigation.navigate('WorkoutDetails', {
      workout: {
        ...workout,
        title: workout.name,
        durationLabel: `${workout.duration} MIN`,
      },
    });
  };

  const openCreateWorkout = () => {
    navigation.navigate('WorkoutForm');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title="WORKOUTS"
        subtitle="CHOOSE YOUR NEXT CHALLENGE"
      />

      <View style={styles.intro}>
        <View style={styles.sectionLabel}>
          <View style={styles.labelLine} />
          <Text style={styles.eyebrow}>YOUR TRAINING PLAN</Text>
        </View>

        <Text style={styles.heading}>
          ALL
          <Text style={styles.headingAccent}> TRAINING.</Text>
        </Text>

        <Text style={styles.description}>
          Find your next challenge. Push harder. Get stronger.
        </Text>

        <AppButton
          title="+ ADD WORKOUT"
          onPress={openCreateWorkout}
          variant="primary"
          size="md"
          style={styles.addButton}
        />
      </View>

      {isLoading && workouts.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.emptyText}>LOADING WORKOUTS...</Text>
        </View>
      ) : error ? (
        <Card style={styles.historyCard}>
          <Text style={styles.emptyTitle}>LOADING ERROR</Text>
          <Text style={styles.emptyText}>{error}</Text>

          <Pressable
            onPress={() => {
              clearError();
              loadWorkouts();
            }}
          >
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </Pressable>
        </Card>
      ) : (
        <View style={styles.list}>
          {workouts.map((workout, index) => (
            <Pressable
              key={workout.id}
              onPress={() => openWorkout(workout)}
              style={({ pressed }) => [
                styles.pressable,
                pressed && styles.pressed,
              ]}
            >
              <Card style={styles.workoutCard}>
                <View
                  style={[
                    styles.accentBar,
                    {
                      backgroundColor:
                        CATEGORY_ACCENTS[workout.category] ||
                        COLORS.primary,
                    },
                  ]}
                />

                <View style={styles.cardContent}>
                  <View style={styles.topRow}>
                    <View style={styles.badgesGroup}>
                      <Badge
                        title={(workout.category || 'Тренировка').toUpperCase()}
                      />
                      <StatusBadge status={workout.status} />
                    </View>

                    <Text style={styles.number}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                  </View>

                  <Text style={styles.title}>
                    {(workout.name || 'Без названия').toUpperCase()}
                  </Text>

                  <View style={styles.bottomRow}>
                    <View style={styles.metaGroup}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>DURATION</Text>
                        <Text style={styles.duration}>
                          {workout.duration} MIN
                        </Text>
                      </View>

                      <View style={styles.metaDivider} />

                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>LEVEL</Text>
                        <Text style={styles.level}>
                          {(workout.level || '—').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.arrowCircle}>
                      <Text style={styles.arrow}>↗</Text>
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <View>
            <View style={styles.sectionLabel}>
              <View style={styles.labelLine} />
              <Text style={styles.eyebrow}>YOUR PROGRESS</Text>
            </View>

            <Text style={styles.historyHeading}>
              RECENT ACTIVITY
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {completedWorkouts.length}
            </Text>
          </View>
        </View>

        {completedWorkouts.length === 0 ? (
          <Card style={styles.historyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>+</Text>
            </View>

            <Text style={styles.emptyTitle}>
              NO WORKOUTS YET
            </Text>

            <Text style={styles.emptyText}>
              Complete your first workout and your activity will show up here.
            </Text>
          </Card>
        ) : (
          <View style={styles.historyList}>
            {completedWorkouts.map((workout, index) => {
              const completion = [...(workout.statusHistory || [])]
                .reverse()
                .find((item) => item.status === 'completed');

              return (
                <Card
                  key={workout.id}
                  style={styles.historyCard}
                >
                  <View style={styles.historyRow}>
                    <View style={styles.historyNumber}>
                      <Text style={styles.historyNumberText}>
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                    </View>

                    <View style={styles.historyInfo}>
                      <Text style={styles.historyTitle}>
                        {workout.name}
                      </Text>

                      <Text style={styles.historyCategory}>
                        {(workout.category || '').toUpperCase()}
                      </Text>
                    </View>

                    <Text style={styles.historyDuration}>
                      {workout.duration} MIN
                    </Text>
                  </View>

                  <View style={styles.historyFooter}>
                    <Text style={styles.historyDate}>
                      {completion?.date
                        ? new Date(completion.date).toLocaleDateString()
                        : ''}
                    </Text>

                    <StatusBadge status="completed" />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
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
    padding: SPACING.lg,
    paddingBottom: 110,
  },
  intro: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
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
  addButton: {
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  list: {
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  pressable: {
    borderRadius: RADIUS.lg,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  workoutCard: {
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 175,
  },
  accentBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  badgesGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  number: {
    color: '#465148',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  metaItem: {
    gap: 5,
  },
  metaLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  duration: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  level: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  metaDivider: {
    width: 1,
    height: 27,
    backgroundColor: COLORS.border,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#263322',
    borderWidth: 1,
    borderColor: '#40532E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  historySection: {
    marginTop: SPACING.xxl,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  historyHeading: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: SPACING.sm,
  },
  countBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#263322',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  countText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  historyList: {
    gap: SPACING.sm,
  },
  historyCard: {
    gap: SPACING.md,
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#263322',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: {
    color: COLORS.primary,
    fontSize: 25,
    fontWeight: '500',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '900',
    marginTop: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  historyNumber: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#202B22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyNumberText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  historyInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  historyTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '900',
  },
  historyCategory: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  historyDuration: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  historyDate: {
    color: COLORS.muted,
    fontSize: TYPOGRAPHY.small,
  },
  loading: {
    alignItems: 'center',
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  retryText: {
    color: COLORS.primary,
    fontWeight: '900',
    marginTop: SPACING.md,
  },
});
