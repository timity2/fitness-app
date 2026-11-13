import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const configured = !!url && !!anonKey && !url.includes('YOUR-PROJECT');

// В браузер попадает только публичный ключ. Все права проверяются на сервере.
export const supabase: SupabaseClient | null = configured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export const db = () => {
  if (!supabase) throw new Error('Supabase не настроен');
  return supabase;
};

/** Разворачивает ответ supabase-js: возвращает data или бросает Error с понятным текстом */
export async function unwrap<T>(
  query: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>,
): Promise<T> {
  const { data, error } = await query;
  if (error) {
    if (error.code === '42501' || /row-level security|permission denied/i.test(error.message)) {
      throw new Error('Недостаточно прав для этой операции');
    }
    throw new Error(error.message);
  }
  return data as T;
}

/** Вызов Edge Function admin-users. Права администратора проверяет сама функция. */
export async function adminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().functions.invoke('admin-users', { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    let message = error.message;
    try {
      const payload = ctx ? await ctx.json() : null;
      if (payload?.error) message = payload.error;
    } catch {
      // тело ответа не JSON
    }
    if (message === 'forbidden') message = 'Недостаточно прав';
    throw new Error(message);
  }
  return data as T;
}
