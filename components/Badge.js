
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export default function Badge({
  title,
  variant = 'primary',
}) {
  const isPrimary = variant === 'primary';

  return (
    <View
      style={[
        styles.badge,
        isPrimary ? styles.primary : styles.secondary,
      ]}
    >
      <Text
        style={[
          styles.text,
          isPrimary ? styles.primaryText : styles.secondaryText,
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  primaryText: {
    color: COLORS.background,
  },
  secondaryText: {
    color: COLORS.primary,
  },
});
