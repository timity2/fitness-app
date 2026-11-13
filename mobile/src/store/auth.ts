import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  /** первичная проверка сохранённой сессии завершена */
  ready: boolean;
  /** пользователь пришёл по ссылке восстановления пароля */
  recovery: boolean;
  setRecovery: (v: boolean) => void;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  ready: false,
  recovery: false,
  setRecovery: (recovery) => set({ recovery }),
}));

let started = false;

/** Однократная инициализация: чтение сохранённой сессии и подписка на изменения. */
export function initAuth() {
  if (started) return;
  started = true;
  supabase.auth
    .getSession()
    .then(({ data }) => useAuth.setState({ session: data.session, ready: true }))
    .catch(() => useAuth.setState({ ready: true }));

  supabase.auth.onAuthStateChange((event, session) => {
    const prev = useAuth.getState().session?.user.id;
    useAuth.setState({ session, ready: true, ...(event === 'PASSWORD_RECOVERY' ? { recovery: true } : {}) });
    if (prev && prev !== session?.user.id) {
      // смена или выход пользователя — чужие данные не должны остаться в кэше
      queryClient.clear();
    }
  });
}

export const useUid = () => useAuth((s) => s.session?.user.id ?? null);

/** uid вне React-компонентов; бросает ошибку, если пользователь не вошёл */
export const requireUid = () => {
  const uid = useAuth.getState().session?.user.id;
  if (!uid) throw new Error('Требуется вход в аккаунт');
  return uid;
};
