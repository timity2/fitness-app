// Достижения. Открываются только сервером по фактическим данным (функция check_achievements).
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { useAchievements, useUserAchievements } from '@/api/progress';
import { useRecords, useSessions } from '@/api/workouts';
import { Card, ErrorState, Header, Loading, ProgressBar, Screen, T, type IconName } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { colors, space } from '@/theme';
import type { Achievement } from '@/types/db';

const ICONS: Record<string, IconName> = { flag: 'flag', barbell: 'barbell', flame: 'flame', trophy: 'trophy', medal: 'medal', calendar: 'calendar' };

function longestStreak(dates: string[]) {
  const days = [...new Set(dates.map((d) => d.slice(0, 10)))].sort();
  let best = 0;
  let cur = 0;
  let prev: number | null = null;
  for (const d of days) {
    const t = Date.parse(d);
    cur = prev !== null && t - prev === 86400000 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = t;
  }
  return best;
}

export default function Achievements() {
  const achievements = useAchievements();
  const { data: unlocked = [] } = useUserAchievements();
  const { data: sessions = [] } = useSessions();
  const { data: records = [] } = useRecords();

  const streak = longestStreak(sessions.map((s) => s.finished_at));
  const current = (a: Achievement) => (a.condition_type === 'workouts_total' ? sessions.length : a.condition_type === 'first_pr' ? Math.min(records.length, 1) : streak);

  return (
    <Screen header={<Header title="Достижения" />}>
      {achievements.isPending ? (
        <Loading />
      ) : achievements.isError ? (
        <ErrorState onRetry={() => achievements.refetch()} />
      ) : (
        <>
          <T v="caption" style={{ marginBottom: space.lg }}>
            Открыто {unlocked.length} из {achievements.data.length}. Достижения выдаются автоматически по вашим реальным тренировкам.
          </T>
          {achievements.data.map((a) => {
            const mine = unlocked.find((u) => u.achievement_id === a.id);
            const value = Math.min(current(a), a.threshold);
            return (
              <Card key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md, opacity: mine ? 1 : 0.75 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: mine ? colors.pinkSoft : colors.card2, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={mine ? ICONS[a.icon] ?? 'trophy' : 'lock-closed'} size={mine ? 26 : 20} color={mine ? colors.pink : colors.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="bodyM" style={{ fontSize: 16 }}>
                    {a.title}
                  </T>
                  <T v="caption">{a.description}</T>
                  {mine ? (
                    <T v="small" color={colors.success} style={{ marginTop: 6 }}>
                      Открыто {formatDate(mine.unlocked_at)}
                    </T>
                  ) : (
                    <View style={{ marginTop: 8 }}>
                      <ProgressBar value={value / a.threshold} height={5} />
                      <T v="small" style={{ marginTop: 4 }}>
                        {value} из {a.threshold}
                      </T>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
