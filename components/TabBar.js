
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const TABS = [
  { id: 'home', label: 'HOME', icon: '⌂' },
  { id: 'workouts', label: 'WORKOUTS', icon: '▣' },
  { id: 'stats', label: 'STATS', icon: '▥' },
  { id: 'profile', label: 'PROFILE', icon: '◉' },
];

export default function TabBar({
  activeTab = 'home',
  onTabPress,
}) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <Pressable
            key={tab.id}
            style={styles.tab}
            onPress={() => onTabPress?.(tab.id)}
          >
            <Text
              style={[
                styles.icon,
                isActive && styles.activeText,
              ]}
            >
              {tab.icon}
            </Text>

            <Text
              style={[
                styles.label,
                isActive && styles.activeText,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  tab: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  icon: {
    color: COLORS.muted,
    fontSize: 21,
  },
  label: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activeText: {
    color: COLORS.primary,
  },
});
