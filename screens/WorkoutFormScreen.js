import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import {
  COLORS,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
} from '../constants/theme';

import Header from '../components/Header';
import Card from '../components/Card';
import AppInput from '../components/ui/AppInput';
import AppButton from '../components/ui/AppButton';
import useWorkoutStore from '../store/useWorkoutStore';

const CATEGORIES = [
  'Силовая',
  'Кардио',
  'Йога',
  'Растяжка',
  'Пилатес',
  'Функциональная',
];

const LEVELS = ['Начинающий', 'Средний', 'Продвинутый'];

export default function WorkoutFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const workout = route.params?.workout;
  const isEditing = !!workout;

  const addWorkout = useWorkoutStore((state) => state.addWorkout);
  const updateWorkout = useWorkoutStore((state) => state.updateWorkout);

  const [name, setName] = useState(workout?.name || '');
  const [category, setCategory] = useState(
    workout?.category || CATEGORIES[0]
  );
  const [level, setLevel] = useState(workout?.level || LEVELS[0]);
  const [duration, setDuration] = useState(
    String(workout?.duration ?? 30)
  );
  const [calories, setCalories] = useState(
    String(workout?.calories ?? 200)
  );
  const [isSaving, setIsSaving] = useState(false);

  const saveWorkout = async () => {
    if (isSaving) {
      return;
    }

    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите название тренировки');
      return;
    }

    if (
      !duration.trim() ||
      !Number.isFinite(Number(duration)) ||
      Number(duration) <= 0
    ) {
      Alert.alert('Ошибка', 'Введите корректную длительность');
      return;
    }

    if (
      !calories.trim() ||
      !Number.isFinite(Number(calories)) ||
      Number(calories) < 0
    ) {
      Alert.alert('Ошибка', 'Введите корректное количество калорий');
      return;
    }

    setIsSaving(true);

    const workoutData = {
      name: name.trim(),
      category,
      level,
      duration: Number(duration),
      calories: Number(calories),
    };

    try {
      let result;

      if (isEditing) {
        result = await updateWorkout(workout.id, workoutData);
      } else {
        result = await addWorkout({
          ...workoutData,
          status: 'pending',
          priority: 'medium',
          exercises: [],
          trainer: null,
          location: null,
          image: null,
        });
      }

      if (!result) {
        Alert.alert(
          'Ошибка',
          'Не удалось сохранить тренировку. Попробуйте ещё раз.'
        );
        return;
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Ошибка',
        error.message || 'Не удалось сохранить тренировку'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Header
        title={isEditing ? 'EDIT WORKOUT' : 'NEW WORKOUT'}
        subtitle="WORKOUT MANAGEMENT"
      />

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>BASIC INFORMATION</Text>

        <AppInput
          label="WORKOUT NAME"
          value={name}
          onChangeText={setName}
          placeholder="Например: Утренняя тренировка"
          maxLength={60}
        />

        <Text style={styles.label}>CATEGORY</Text>

        <View style={styles.options}>
          {CATEGORIES.map((item) => (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              style={[
                styles.option,
                category === item && styles.optionActive,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  category === item && styles.optionTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>DIFFICULTY LEVEL</Text>

        <View style={styles.options}>
          {LEVELS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setLevel(item)}
              style={[
                styles.option,
                level === item && styles.optionActive,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  level === item && styles.optionTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <AppInput
          label="DURATION (MINUTES)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
          placeholder="30"
        />

        <AppInput
          label="CALORIES"
          value={calories}
          onChangeText={setCalories}
          keyboardType="numeric"
          placeholder="200"
        />
      </Card>

      <View style={styles.actions}>
        <AppButton
          title={isEditing ? 'SAVE CHANGES' : 'CREATE WORKOUT'}
          onPress={saveWorkout}
          loading={isSaving}
          disabled={isSaving}
          variant="primary"
          size="lg"
        />

        <AppButton
          title="CANCEL"
          variant="secondary"
          size="lg"
          disabled={isSaving}
          onPress={() => navigation.goBack()}
        />
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
  formCard: {
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: SPACING.sm,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  option: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  optionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  optionTextActive: {
    color: COLORS.background,
  },
  actions: {
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
});