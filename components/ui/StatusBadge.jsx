
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import {
  COLORS,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
} from '../../constants/theme';

const STATUS_CONFIG = {
  pending: {
    title: 'Ожидает',
    color: '#F5B942',
    background: 'rgba(245, 185, 66, 0.15)',
  },
  in_progress: {
    title: 'В процессе',
    color: '#4DA3FF',
    background: 'rgba(77, 163, 255, 0.15)',
  },
  completed: {
    title: 'Завершено',
    color: COLORS.success,
    background: 'rgba(85, 217, 138, 0.15)',
  },
  cancelled: {
    title: 'Отменено',
    color: COLORS.error,
    background: 'rgba(255, 77, 77, 0.15)',
  },
};

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || {
    title: 'Неизвестно',
    color: COLORS.textSecondary,
    background: 'rgba(160, 170, 162, 0.12)',
  };
}

export default function StatusBadge({ status, style }) {
  const config = getStatusConfig(status);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.background },
        style,
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: config.color },
        ]}
      />

      <Text style={[styles.text, { color: config.color }]}>
        {config.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm + 3,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.round,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.round,
  },
  text: {
    fontSize: TYPOGRAPHY.small - 1,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
