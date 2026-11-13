import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

import { demoClient } from '@/demo/localBackend';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Демо-режим: ключи Supabase не заданы, данные хранятся только на устройстве. */
export const isDemo = !url || !anonKey || url.includes('YOUR-PROJECT');

/**
 * Сессия шифруется AES-256: ключ лежит в Keychain / Keystore (expo-secure-store),
 * а зашифрованное значение — в AsyncStorage (SecureStore ограничен ~2 КБ на запись).
 */
class EncryptedSessionStorage {
  private async encrypt(key: string, value: string) {
    const encryptionKey = Crypto.getRandomValues(new Uint8Array(32));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encrypted);
  }

  private async decrypt(key: string, value: string) {
    const keyHex = await SecureStore.getItemAsync(key);
    if (!keyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
  }

  async getItem(key: string) {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    try {
      return await this.decrypt(key, encrypted);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(key, await this.encrypt(key, value));
  }

  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}

function createRealClient(): SupabaseClient {
  const client = createClient(url, anonKey, {
    auth: {
      // в вебе SecureStore недоступен — используется localStorage через AsyncStorage
      storage: Platform.OS === 'web' ? AsyncStorage : new EncryptedSessionStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (s) => {
      if (s === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
  }
  return client;
}

export const supabase: SupabaseClient = isDemo ? (demoClient as unknown as SupabaseClient) : createRealClient();

/** Смена пароля без письма — существует только в демо-режиме. */
export const demoResetPassword = (email: string, password: string) => demoClient.auth.demoResetPassword(email, password);

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

const AUTH_MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'Неверный email или пароль'],
  [/already registered|already been registered/i, 'Аккаунт с таким email уже существует'],
  [/email not confirmed/i, 'Email не подтверждён. Проверьте почту'],
  [/rate limit|too many/i, 'Слишком много попыток. Попробуйте позже'],
  [/password should be|weak password/i, 'Пароль слишком простой'],
  [/network|failed to fetch|fetch failed/i, 'Нет соединения с сервером. Проверьте интернет'],
  [/banned/i, 'Аккаунт заблокирован'],
  [/different from the old/i, 'Новый пароль должен отличаться от старого'],
];

/** Переводит техническое сообщение об ошибке в понятный пользователю текст. */
export function humanError(e: unknown): string {
  const message = e instanceof Error ? e.message : typeof e === 'string' ? e : String((e as { message?: string })?.message ?? '');
  for (const [re, text] of AUTH_MESSAGES) if (re.test(message)) return text;
  return message || 'Что-то пошло не так. Попробуйте ещё раз';
}

/** Разворачивает ответ supabase-js: возвращает data либо бросает ApiError. */
export async function unwrap<T>(
  query: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>,
): Promise<T> {
  const { data, error } = await query;
  if (error) throw new ApiError(humanError(error), error.code);
  return data as T;
}
