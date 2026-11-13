// Локальные уведомления (Expo Notifications). Ничего не планируется без разрешения устройства
// и без включённых настроек пользователя. В вебе функции безопасно ничего не делают.
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type { NotificationPreferences } from '@/types/db';

const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getPermission(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionState;
}

export async function requestPermission(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  if (!current.canAskAgain) return 'denied';
  const { status } = await Notifications.requestPermissionsAsync();
  return status as PermissionState;
}

export const openSystemSettings = () => Linking.openSettings();

const REMINDERS: { key: 'workout' | 'nutrition' | 'water' | 'goal'; title: string; body: string }[] = [
  { key: 'workout', title: 'Время тренировки', body: 'Запланированная тренировка ждёт вас в Pulse.' },
  { key: 'nutrition', title: 'Дневник питания', body: 'Не забудьте записать приёмы пищи.' },
  { key: 'water', title: 'Вода', body: 'Самое время выпить стакан воды.' },
  { key: 'goal', title: 'Ваша цель', body: 'Загляните в Pulse и проверьте прогресс.' },
];

const REST_ID_PREFIX = 'pulse-rest';
let restNotificationId: string | null = null;

/** Пересоздаёт ежедневные напоминания по настройкам пользователя. */
export async function syncReminders(prefs: NotificationPreferences | null | undefined) {
  if (!supported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.kind === 'reminder')
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!prefs?.enabled) return;
  if ((await getPermission()) !== 'granted') return;

  for (const r of REMINDERS) {
    if (!prefs[`${r.key}_enabled`]) continue;
    const [hour, minute] = String(prefs[`${r.key}_time`]).split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body, data: { kind: 'reminder', type: r.key } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: hour || 0, minute: minute || 0 },
    });
  }
}

/** Сигнал об окончании отдыха — сработает, даже если приложение свёрнуто. */
export async function scheduleRestEnd(seconds: number, withSound: boolean) {
  if (!supported || seconds < 1) return;
  await cancelRestEnd();
  if ((await getPermission()) !== 'granted') return;
  restNotificationId = await Notifications.scheduleNotificationAsync({
    identifier: `${REST_ID_PREFIX}-${Date.now()}`,
    content: { title: 'Отдых окончен', body: 'Пора приступать к следующему подходу.', sound: withSound, data: { kind: 'rest' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.ceil(seconds) },
  });
}

export async function cancelRestEnd() {
  if (!supported || !restNotificationId) return;
  const id = restNotificationId;
  restNotificationId = null;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}
