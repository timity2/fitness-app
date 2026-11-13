// Настройки уведомлений: общий переключатель, отдельные типы, время, разрешение устройства
import React, { useEffect, useState } from 'react';
import { Platform, Switch, View } from 'react-native';

import { useNotificationPrefs, useUpdateNotificationPrefs } from '@/api/notifications';
import { Button, Card, Chip, ErrorState, Header, InfoBox, Loading, Screen, SectionTitle, T } from '@/components/ui';
import { getPermission, openSystemSettings, requestPermission, type PermissionState } from '@/lib/notifications';
import { colors, space } from '@/theme';
import type { NotificationPreferences } from '@/types/db';

type ReminderKey = 'workout' | 'nutrition' | 'water' | 'goal';
const REMINDERS: { key: ReminderKey; title: string; text: string; times: string[] }[] = [
  { key: 'workout', title: 'Напоминание о тренировке', text: 'Ежедневно в выбранное время', times: ['07:00', '12:00', '18:00', '20:00'] },
  { key: 'nutrition', title: 'Напоминание о питании', text: 'Напомнит заполнить дневник', times: ['09:00', '13:00', '19:00', '21:00'] },
  { key: 'water', title: 'Напоминание о воде', text: 'Напомнит выпить воды', times: ['09:00', '11:00', '15:00', '17:00'] },
  { key: 'goal', title: 'Напоминание о цели', text: 'Напомнит проверить прогресс', times: ['08:00', '09:00', '20:00', '22:00'] },
];

export default function NotificationSettings() {
  const prefs = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();
  const [permission, setPermission] = useState<PermissionState>('undetermined');

  useEffect(() => {
    getPermission().then(setPermission).catch(() => undefined);
  }, []);

  if (prefs.isPending) {
    return (
      <Screen header={<Header title="Уведомления" />}>
        <Loading />
      </Screen>
    );
  }
  if (prefs.isError || !prefs.data) {
    return (
      <Screen header={<Header title="Уведомления" />}>
        <ErrorState onRetry={() => prefs.refetch()} />
      </Screen>
    );
  }

  const p = prefs.data;
  const set = (patch: Partial<NotificationPreferences>) => update.mutate(patch);
  const toggle = (value: boolean, onChange: (v: boolean) => void, disabled = false) => (
    <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.pink, false: colors.card2 }} thumbColor={colors.text} />
  );

  const enableAll = async (enabled: boolean) => {
    if (!enabled) return set({ enabled: false });
    // разрешение запрашивается только по явному действию пользователя
    const state = await requestPermission();
    setPermission(state);
    if (state === 'granted') set({ enabled: true });
  };

  return (
    <Screen header={<Header title="Уведомления" />}>
      {permission === 'unsupported' ? (
        <InfoBox>В веб-версии системные уведомления недоступны. Настройки сохранятся и будут применены в мобильном приложении.</InfoBox>
      ) : permission === 'denied' ? (
        <View style={{ gap: space.md }}>
          <InfoBox icon="notifications-off-outline">Уведомления запрещены в настройках устройства. Разрешите их для Pulse, чтобы получать напоминания.</InfoBox>
          <Button title="Открыть настройки устройства" variant="secondary" small onPress={openSystemSettings} />
        </View>
      ) : null}

      <Card style={{ marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <T v="h3">Уведомления</T>
          <T v="caption">{p.enabled ? 'Включены' : 'Выключены — Pulse ничего не отправляет'}</T>
        </View>
        {toggle(p.enabled && (permission === 'granted' || Platform.OS === 'web'), enableAll, permission === 'denied')}
      </Card>

      <SectionTitle title="Напоминания" />
      {REMINDERS.map((r) => {
        const enabled = p[`${r.key}_enabled`];
        const time = String(p[`${r.key}_time`]).slice(0, 5);
        const times = r.times.includes(time) ? r.times : [...r.times, time].sort();
        return (
          <Card key={r.key} style={{ marginBottom: space.md, opacity: p.enabled ? 1 : 0.5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <T v="bodyM">{r.title}</T>
                <T v="caption">{r.text}</T>
              </View>
              {toggle(enabled, (v) => set({ [`${r.key}_enabled`]: v }), !p.enabled)}
            </View>
            {enabled && p.enabled ? (
              <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.md }}>
                {times.map((t) => (
                  <Chip key={t} label={t} active={time === t} onPress={() => set({ [`${r.key}_time`]: t })} />
                ))}
              </View>
            ) : null}
          </Card>
        );
      })}

      <SectionTitle title="Сообщения в приложении" />
      <Card style={{ gap: space.lg, opacity: p.enabled ? 1 : 0.5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <T v="bodyM">Достижения</T>
            <T v="caption">Когда открыто новое достижение</T>
          </View>
          {toggle(p.achievement_enabled, (v) => set({ achievement_enabled: v }), !p.enabled)}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <T v="bodyM">Системные сообщения</T>
            <T v="caption">Важные изменения в работе Pulse</T>
          </View>
          {toggle(p.system_enabled, (v) => set({ system_enabled: v }), !p.enabled)}
        </View>
      </Card>
    </Screen>
  );
}
