import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Cover } from '@/components/Cover';
import { Card, T } from '@/components/ui';
import { LEVEL_SHORT, LOCATION_LABELS, plural } from '@/lib/format';
import { colors, space } from '@/theme';
import type { WorkoutProgram } from '@/types/db';

export function Tag({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        height: 22,
        borderRadius: 7,
        backgroundColor: accent ? colors.pinkSoft : colors.card2,
        justifyContent: 'center',
      }}
    >
      <T v="small" color={accent ? colors.pinkLight : colors.text2}>
        {label}
      </T>
    </View>
  );
}

export function ProgramCard({
  program,
  exercises,
  note,
  mine,
}: {
  program: WorkoutProgram;
  exercises?: number;
  note?: string;
  mine?: boolean;
}) {
  return (
    <Card onPress={() => router.push({ pathname: '/workout/[id]', params: { id: program.id } })} style={{ flexDirection: 'row', gap: space.md, padding: space.md, marginBottom: space.md }}>
      <Cover imageUrl={program.image_url} categoryId={program.category_id} style={{ width: 88, height: 88 }} iconSize={36} rounded={14} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <T v="bodyM" numberOfLines={2} style={{ fontSize: 16 }}>
          {program.name}
        </T>
        <T v="caption" numberOfLines={1} style={{ marginTop: 2 }}>
          {exercises != null ? `${exercises} ${plural(exercises, 'упражнение', 'упражнения', 'упражнений')} · ` : ''}
          {program.duration_min} мин
        </T>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <Tag label={LEVEL_SHORT[program.difficulty]} accent />
          <Tag label={LOCATION_LABELS[program.location]} />
          {mine ? <Tag label="В моих" /> : null}
        </View>
        {note ? (
          <T v="small" color={colors.text2} numberOfLines={1} style={{ marginTop: 6 }}>
            {note}
          </T>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} style={{ alignSelf: 'center' }} />
    </Card>
  );
}
