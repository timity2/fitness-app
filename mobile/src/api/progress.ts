import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isDemo, supabase, unwrap } from '@/lib/supabase';
import { requireUid, useUid } from '@/store/auth';
import type { Achievement, Measurement, ProgressPhoto, UserAchievement } from '@/types/db';

// ---------- Измерения ----------
export function useMeasurements() {
  const uid = useUid();
  return useQuery({
    queryKey: ['measurements', uid],
    enabled: !!uid,
    queryFn: () =>
      unwrap<Measurement[]>(
        supabase
          .from('user_measurements')
          .select('*')
          .eq('user_id', uid!)
          .order('measured_on', { ascending: false })
          .order('created_at', { ascending: false }),
      ),
  });
}

export type MeasurementInput = Pick<
  Measurement,
  'measured_on' | 'weight_kg' | 'chest_cm' | 'waist_cm' | 'hips_cm' | 'arm_cm' | 'leg_cm'
>;

export function useAddMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MeasurementInput) =>
      unwrap<Measurement>(
        supabase.from('user_measurements').insert({ user_id: requireUid(), ...input }).select('*').single(),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['measurements'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useDeleteMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(supabase.from('user_measurements').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['measurements'] }),
  });
}

// ---------- Файлы (приватные бакеты, доступ по подписанным ссылкам) ----------
const SIGNED_URL_TTL = 60 * 60;

async function uploadPrivate(bucket: 'progress-photos' | 'avatars', localUri: string): Promise<string> {
  if (isDemo) return localUri; // демо-режим: файл остаётся на устройстве
  const uid = requireUid();
  const response = await fetch(localUri);
  const body = await response.arrayBuffer();
  const ext = (localUri.split('.').pop() ?? 'jpg').split('?')[0].toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) ? ext : 'jpg';
  const path = `${uid}/${Date.now()}.${safeExt}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType: `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function signedUrl(bucket: 'progress-photos' | 'avatars', path: string | null): Promise<string | null> {
  if (!path) return null;
  if (isDemo || /^(https?:|file:|blob:|data:|content:)/.test(path)) return path;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
  return error ? null : data.signedUrl;
}

export const uploadAvatar = (localUri: string) => uploadPrivate('avatars', localUri);

export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['avatar-url', path],
    enabled: !!path,
    staleTime: (SIGNED_URL_TTL - 300) * 1000,
    queryFn: () => signedUrl('avatars', path ?? null),
  });
}

// ---------- Фотографии прогресса ----------
export type PhotoWithUrl = ProgressPhoto & { url: string | null };

export function usePhotos() {
  const uid = useUid();
  return useQuery({
    queryKey: ['photos', uid],
    enabled: !!uid,
    staleTime: (SIGNED_URL_TTL - 300) * 1000,
    queryFn: async (): Promise<PhotoWithUrl[]> => {
      const rows = await unwrap<ProgressPhoto[]>(
        supabase.from('body_progress_photos').select('*').eq('user_id', uid!).order('taken_on', { ascending: false }),
      );
      return Promise.all(rows.map(async (r) => ({ ...r, url: await signedUrl('progress-photos', r.storage_path) })));
    },
  });
}

export function useAddPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uri, takenOn, note }: { uri: string; takenOn: string; note: string }) => {
      const path = await uploadPrivate('progress-photos', uri);
      return unwrap<ProgressPhoto>(
        supabase
          .from('body_progress_photos')
          .insert({ user_id: requireUid(), storage_path: path, taken_on: takenOn, note })
          .select('*')
          .single(),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos'] }),
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photo: ProgressPhoto) => {
      if (!isDemo) await supabase.storage.from('progress-photos').remove([photo.storage_path]);
      await unwrap(supabase.from('body_progress_photos').delete().eq('id', photo.id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos'] }),
  });
}

// ---------- Достижения ----------
export function useAchievements() {
  return useQuery({
    queryKey: ['achievements'],
    staleTime: 1000 * 60 * 60,
    queryFn: () => unwrap<Achievement[]>(supabase.from('achievements').select('*').order('sort_order')),
  });
}

export function useUserAchievements() {
  const uid = useUid();
  return useQuery({
    queryKey: ['user-achievements', uid],
    enabled: !!uid,
    queryFn: () => unwrap<UserAchievement[]>(supabase.from('user_achievements').select('*').eq('user_id', uid!)),
  });
}
