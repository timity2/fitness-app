import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { syncReminders } from '@/lib/notifications';
import { supabase, unwrap } from '@/lib/supabase';
import { requireUid, useUid } from '@/store/auth';
import type { AppNotification, NotificationPreferences } from '@/types/db';

export function useNotifications() {
  const uid = useUid();
  return useQuery({
    queryKey: ['notifications', uid],
    enabled: !!uid,
    queryFn: () =>
      unwrap<AppNotification[]>(
        supabase.from('notifications').select('*').eq('user_id', uid!).order('created_at', { ascending: false }).limit(100),
      ),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap(supabase.from('notifications').update({ is_read: true }).eq('user_id', requireUid()).eq('is_read', false)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(supabase.from('notifications').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useNotificationPrefs() {
  const uid = useUid();
  return useQuery({
    queryKey: ['notification-prefs', uid],
    enabled: !!uid,
    queryFn: () =>
      unwrap<NotificationPreferences | null>(
        supabase.from('notification_preferences').select('*').eq('user_id', uid!).maybeSingle(),
      ),
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<NotificationPreferences, 'user_id'>>) =>
      unwrap<NotificationPreferences>(
        supabase
          .from('notification_preferences')
          .upsert({ user_id: requireUid(), ...patch }, { onConflict: 'user_id' })
          .select('*')
          .single(),
      ),
    onSuccess: async (prefs) => {
      qc.setQueryData(['notification-prefs', prefs.user_id], prefs);
      await syncReminders(prefs).catch(() => undefined);
    },
  });
}
