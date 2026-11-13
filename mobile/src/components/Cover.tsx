// Обложка упражнения / тренировки. Если у записи есть image_url — показывается изображение.
// Иначе — тематическая заглушка в фирменном стиле: градиент и пиктограмма группы мышц.
// Реальные фото подключаются через поле image_url в админ-панели, код менять не нужно.
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useCategories } from '@/api/workouts';
import { colors } from '@/theme';

type McIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const THEMES: Record<string, { icon: McIcon; colors: readonly [string, string] }> = {
  chest: { icon: 'weight-lifter', colors: ['#5A1F45', '#1B1420'] },
  back: { icon: 'human-handsup', colors: ['#3E2466', '#17131F'] },
  legs: { icon: 'run-fast', colors: ['#6A1E3C', '#1C1218'] },
  shoulders: { icon: 'karate', colors: ['#4B2360', '#18131F'] },
  biceps: { icon: 'arm-flex', colors: ['#7A2350', '#1D1319'] },
  triceps: { icon: 'arm-flex-outline', colors: ['#56214F', '#19131D'] },
  abs: { icon: 'yoga', colors: ['#3A2A6B', '#151320'] },
  cardio: { icon: 'heart-pulse', colors: ['#8A2148', '#1E1217'] },
  'full-body': { icon: 'dumbbell', colors: ['#6B2260', '#1A131D'] },
  food: { icon: 'food-apple-outline', colors: ['#4A2356', '#17131C'] },
};
const FALLBACK = THEMES['full-body'];

export function Cover({
  imageUrl,
  categoryId,
  theme,
  style,
  iconSize = 44,
  rounded = 16,
}: {
  imageUrl?: string | null;
  categoryId?: string | null;
  theme?: keyof typeof THEMES;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  rounded?: number;
}) {
  const { data: categories } = useCategories();
  const slug = theme ?? categories?.find((c) => c.id === categoryId)?.slug ?? 'full-body';
  const t = THEMES[slug] ?? FALLBACK;

  if (imageUrl) {
    return (
      <View style={[{ borderRadius: rounded, overflow: 'hidden', backgroundColor: colors.card2 }, style]}>
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk" />
      </View>
    );
  }

  return (
    <View style={[{ borderRadius: rounded, overflow: 'hidden' }, style]}>
      <LinearGradient colors={t.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="xMaxYMid slice">
        <Circle cx="82" cy="22" r="34" stroke="rgba(255,118,180,0.16)" strokeWidth="0.8" fill="none" />
        <Circle cx="82" cy="22" r="22" stroke="rgba(255,118,180,0.22)" strokeWidth="0.8" fill="none" />
        <Circle cx="82" cy="22" r="10" fill="rgba(240,68,145,0.16)" />
      </Svg>
      <View style={styles.center}>
        <MaterialCommunityIcons name={t.icon} size={iconSize} color={colors.pinkLight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
