// Логика запуска: проверка сессии, анкеты, обработка ссылок авторизации,
// синхронизация незавершённой тренировки и напоминаний.
import * as Linking from 'expo-linking';
import { router, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useNotificationPrefs } from '@/api/notifications';
import { useProfile } from '@/api/profile';
import { loadRemoteActiveWorkout, saveRemoteActiveWorkout } from '@/api/workouts';
import { notify } from '@/components/ui';
import { syncReminders } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { initAuth, useAuth, useUid } from '@/store/auth';
import { useWorkout } from '@/store/workout';

const SPLASH_MIN_MS = 1200;

/** Разбирает ссылку из письма (подтверждение email / восстановление пароля). */
async function handleAuthUrl(url: string) {
  const fragment = url.includes('#') ? url.split('#')[1] : '';
  const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
  const params = new URLSearchParams(fragment || query);
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  const code = new URLSearchParams(query).get('code');
  const isRecovery = params.get('type') === 'recovery' || url.includes('new-password');

  if (params.get('error_description')) {
    notify('Ссылка недействительна', 'Срок действия ссылки истёк или она уже была использована. Запросите новую.');
    return;
  }
  if (access && refresh) {
    const { error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
    if (!error && isRecovery) useAuth.getState().setRecovery(true);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && isRecovery) useAuth.getState().setRecovery(true);
  }
}

export function useAppBootstrap() {
  const { session, ready, recovery } = useAuth();
  const profile = useProfile();
  const segments = useSegments() as string[];
  const [splashDone, setSplashDone] = useState(false);
  const url = Linking.useURL();

  useEffect(() => {
    initAuth();
    const t = setTimeout(() => setSplashDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (url) handleAuthUrl(url).catch(() => undefined);
  }, [url]);

  // Маршрутизация по состоянию аккаунта
  useEffect(() => {
    if (!ready || !splashDone) return;
    const root = segments[0];

    if (!session) {
      // юридические документы доступны и без входа (ссылка с экрана регистрации)
      if (root !== '(auth)' && root !== 'legal') router.replace('/(auth)/welcome');
      return;
    }
    if (recovery) {
      if (segments[1] !== 'new-password') router.replace('/(auth)/new-password');
      return;
    }
    if (profile.isPending || profile.isError) return; // остаёмся на заставке (там же — повтор при ошибке)

    if (profile.data?.is_blocked) {
      supabase.auth.signOut().finally(() => notify('Аккаунт заблокирован', 'Обратитесь в поддержку Pulse.'));
      return;
    }
    if (!profile.data?.onboarding_completed) {
      if (root !== 'onboarding') router.replace('/onboarding');
      return;
    }
    if (root === undefined || root === '(auth)') router.replace('/(tabs)');
  }, [ready, splashDone, session, recovery, profile.isPending, profile.isError, profile.data, segments]);

  useActiveWorkoutSync();
  useReminderSync();
}

/** Незавершённая тренировка: локальная копия + копия на сервере для восстановления. */
function useActiveWorkoutSync() {
  const uid = useUid();
  const active = useWorkout((s) => s.active);
  const [hydrated, setHydrated] = useState(useWorkout.persist.hasHydrated());
  const restoredFor = useRef<string | null>(null);
  const lastSaved = useRef<string>('');

  useEffect(() => useWorkout.persist.onFinishHydration(() => setHydrated(true)), []);

  // тренировка другого пользователя на этом устройстве не показывается
  useEffect(() => {
    if (hydrated && uid && active && active.userId !== uid) useWorkout.getState().discard();
  }, [hydrated, uid, active]);

  // восстановление с сервера, если локальной копии нет (например, приложение переустановлено)
  useEffect(() => {
    if (!hydrated || !uid || restoredFor.current === uid) return;
    restoredFor.current = uid;
    if (useWorkout.getState().active) return;
    loadRemoteActiveWorkout()
      .then((remote) => {
        if (remote && remote.userId === uid && !useWorkout.getState().active) useWorkout.getState().hydrate(remote);
      })
      .catch(() => undefined);
  }, [hydrated, uid]);

  // отложенная запись изменений на сервер
  useEffect(() => {
    if (!hydrated || !uid) return;
    const snapshot = JSON.stringify(active);
    if (snapshot === lastSaved.current) return;
    const t = setTimeout(() => {
      lastSaved.current = snapshot;
      saveRemoteActiveWorkout(active).catch(() => undefined); // без сети остаётся локальная копия
    }, 1500);
    return () => clearTimeout(t);
  }, [hydrated, uid, active]);
}

function useReminderSync() {
  const prefs = useNotificationPrefs();
  useEffect(() => {
    if (prefs.data) syncReminders(prefs.data).catch(() => undefined);
  }, [prefs.data]);
}
