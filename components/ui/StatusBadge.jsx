
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
    color: '#8BEA5B',
    background: 'rgba(139, 234, 91, 0.15)',
  },
  cancelled: {
    title: 'Отменено',
    color: '#FF6262',
    background: 'rgba(255, 98, 98, 0.15)',
  },
};

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || {
    title: 'Неизвестно',
    color: '#AAAAAA',
    background: 'rgba(170, 170, 170, 0.15)',
  };
}

export default function StatusBadge({ status }) {
  const config = getStatusConfig(status);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.background },
      ]}
    >
      <Text style={[styles.text, { color: config.color }]}>
        {config.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 100,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
