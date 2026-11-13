// Центр уведомлений: сообщения из таблицы notifications
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { useDeleteNotification, useMarkAllRead, useNotifications } from '@/api/notifications';
import { Card, EmptyState, ErrorState, Header, IconButton, Loading, Screen, T, type IconName } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { colors, space } from '@/theme';
import type { NotificationType } from '@/types/db';

const ICONS: Record<NotificationType, IconName> = {
  workout: 'barbell',
  nutrition: 'nutrition',
  water: 'water',
  goal: 'flag',
  achievement: 'trophy',
  system: 'information-circle',
};

export default function Notifications() {
  const list = useNotifications();
  const markAll = useMarkAllRead();
  const remove = useDeleteNotification();
  const hasUnread = (list.data ?? []).some((n) => !n.is_read);

  // открытие экрана отмечает сообщения прочитанными
  useEffect(() => {
    if (hasUnread && !markAll.isPending) {
      const t = setTimeout(() => markAll.mutate(), 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread]);

  return (
    <Screen header={<Header title="Уведомления" right={<IconButton icon="settings-outline" label="Настройки уведомлений" onPress={() => router.push('/settings/notifications')} />} />}>
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState icon="notifications-outline" title="Уведомлений нет" text="Здесь появятся сообщения о достижениях и системные уведомления." action="Настроить напоминания" onAction={() => router.push('/settings/notifications')} />
      ) : (
        list.data.map((n) => (
          <Card key={n.id} style={{ flexDirection: 'row', gap: space.md, marginBottom: space.md, alignItems: 'flex-start' }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={ICONS[n.type] ?? 'notifications'} size={20} color={colors.pink} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <T v="bodyM" style={{ flexShrink: 1 }}>
                  {n.title}
                </T>
                {!n.is_read ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.pink }} /> : null}
              </View>
              {n.body ? <T v="caption">{n.body}</T> : null}
              <T v="small" style={{ marginTop: 6 }}>
                {formatDate(n.created_at)}
              </T>
            </View>
            <Pressable hitSlop={10} onPress={() => remove.mutate(n.id)} accessibilityLabel="Удалить уведомление">
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </Card>
        ))
      )}
    </Screen>
  );
}
