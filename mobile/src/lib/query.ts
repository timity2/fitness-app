import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { onlineManager, QueryClient } from '@tanstack/react-query';

import { isDemo } from '@/lib/supabase';

// TanStack Query узнаёт о состоянии сети: при отсутствии интернета запросы
// ставятся на паузу, а мутации выполняются после восстановления связи.
if (!isDemo) {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24, // кэш живёт сутки и переживает перезапуск приложения
      retry: isDemo ? 0 : 1,
      networkMode: isDemo ? 'always' : 'offlineFirst',
    },
    mutations: {
      networkMode: isDemo ? 'always' : 'offlineFirst',
    },
  },
});

/** Кэш запросов сохраняется на устройстве — последние данные видны без интернета. */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'pulse.query-cache.v1',
  throttleTime: 1000,
});
