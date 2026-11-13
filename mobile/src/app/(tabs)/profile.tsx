// Профиль и настройки
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Switch, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useGoal, useProfile, useSettings, useUpdateSettings } from '@/api/profile';
import { Avatar } from '@/components/Avatar';
import { Button, Card, confirm, InfoBox, notify, OptionCard, Row, Screen, SectionTitle, Segmented, Sheet, T } from '@/components/ui';
import { ageFrom, GOAL_LABELS, LEVEL_LABELS, plural, units } from '@/lib/format';
import { humanError, isDemo, supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { useWorkout } from '@/store/workout';
import { colors, space } from '@/theme';
import type { UnitSystem } from '@/types/db';

export default function ProfileTab() {
  const qc = useQueryClient();
  const session = useAuth((s) => s.session);
  const { data: profile } = useProfile();
  const { data: goal } = useGoal();
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const u = units(settings?.unit_system ?? 'metric');
  const [languageOpen, setLanguageOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const age = ageFrom(profile?.birth_date ?? null);
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Пользователь Pulse';

  const signOut = () =>
    confirm('Выйти из аккаунта?', 'Вы сможете войти снова с тем же email и паролем.', async () => {
      useWorkout.getState().discard();
      await supabase.auth.signOut();
      qc.clear();
    }, 'Выйти');

  const deleteAccount = () =>
    confirm(
      'Удалить аккаунт?',
      'Профиль, тренировки, измерения, фотографии и дневник питания будут удалены безвозвратно.',
      () =>
        confirm('Вы уверены?', 'Это действие нельзя отменить.', async () => {
          setDeleting(true);
          try {
            // Удаление выполняет Edge Function: личность берётся из токена, а не из запроса
            const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
            if (error) throw error;
            useWorkout.getState().discard();
            await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
            qc.clear();
          } catch (e) {
            notify('Не удалось удалить аккаунт', humanError(e));
          } finally {
            setDeleting(false);
          }
        }, 'Удалить навсегда', true),
      'Продолжить',
      true,
    );

  return (
    <Screen>
      <T v="h1" style={{ marginTop: space.sm }}>
        Профиль
      </T>

      <Card style={{ marginTop: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Avatar profile={profile} size={68} />
          <View style={{ flex: 1 }}>
            <T v="h2" numberOfLines={1} style={{ fontSize: 20 }}>
              {name}
            </T>
            <T v="caption" numberOfLines={1}>
              {session?.user.email}
            </T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: space.lg, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Cell label="Возраст" value={age != null ? `${age} ${plural(age, 'год', 'года', 'лет')}` : '—'} />
          <Cell label="Рост" value={u.length(profile?.height_cm)} />
          <Cell label="Вес" value={u.weight(profile?.weight_kg)} />
        </View>
        <View style={{ marginTop: space.lg, gap: 6 }}>
          <Pair label="Цель" value={goal ? GOAL_LABELS[goal.goal_type] : 'не задана'} />
          <Pair label="Уровень подготовки" value={profile?.fitness_level ? LEVEL_LABELS[profile.fitness_level] : 'не указан'} />
        </View>
        <Button title="Редактировать профиль" variant="secondary" small icon="create-outline" style={{ marginTop: space.lg }} onPress={() => router.push('/profile/edit')} />
      </Card>

      <SectionTitle title="Тренировки" />
      <Card style={{ paddingVertical: 4 }}>
        <Row icon="clipboard-outline" title="Анкета и график" onPress={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })} />
        <Row
          icon="phone-portrait-outline"
          title="Вибрация таймера отдыха"
          right={<Switch value={settings?.timer_vibration ?? true} onValueChange={(v) => update.mutate({ timer_vibration: v })} trackColor={{ true: colors.pink, false: colors.card2 }} thumbColor={colors.text} />}
        />
        <Row
          icon="volume-high-outline"
          title="Звук таймера отдыха"
          right={<Switch value={settings?.timer_sound ?? true} onValueChange={(v) => update.mutate({ timer_sound: v })} trackColor={{ true: colors.pink, false: colors.card2 }} thumbColor={colors.text} />}
          last
        />
      </Card>

      <SectionTitle title="Настройки" />
      <Card style={{ paddingVertical: 4 }}>
        <Row icon="notifications-outline" title="Уведомления" onPress={() => router.push('/settings/notifications')} />
        <Row icon="language-outline" title="Язык" value="Русский" onPress={() => setLanguageOpen(true)} />
        <View style={{ paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <T v="bodyM" style={{ marginBottom: space.sm }}>
            Единицы измерения
          </T>
          <Segmented<UnitSystem>
            value={settings?.unit_system ?? 'metric'}
            onChange={(unit_system) => update.mutate({ unit_system })}
            options={[
              { value: 'metric', label: 'Метрические (кг, см)' },
              { value: 'imperial', label: 'Имперские (фунты, дюймы)' },
            ]}
          />
        </View>
        <Row icon="key-outline" title="Изменение пароля" onPress={() => router.push('/settings/password')} last />
      </Card>

      <SectionTitle title="Документы" />
      <Card style={{ paddingVertical: 4 }}>
        <Row icon="shield-checkmark-outline" title="Конфиденциальность" onPress={() => setPrivacyOpen(true)} />
        <Row icon="document-text-outline" title="Условия использования" onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })} />
        <Row icon="lock-closed-outline" title="Политика конфиденциальности" onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })} last />
      </Card>

      <SectionTitle title="Аккаунт" />
      <Card style={{ paddingVertical: 4 }}>
        <Row icon="log-out-outline" title="Выйти из аккаунта" onPress={signOut} />
        <Row icon="trash-outline" title={deleting ? 'Удаление…' : 'Удалить аккаунт'} danger onPress={deleting ? undefined : deleteAccount} last />
      </Card>

      <T v="small" center style={{ marginTop: space.xl }}>
        Pulse 1.0.0{isDemo ? ' · демо-режим (данные на устройстве)' : ''}
      </T>

      <Sheet visible={languageOpen} onClose={() => setLanguageOpen(false)} title="Язык приложения">
        <OptionCard title="Русский" selected onPress={() => setLanguageOpen(false)} />
        <View style={{ opacity: 0.5 }}>
          <OptionCard title="English" subtitle="Перевод интерфейса в разработке" selected={false} onPress={() => undefined} />
        </View>
      </Sheet>

      <Sheet visible={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Конфиденциальность">
        <View style={{ gap: space.md, marginBottom: space.lg }}>
          <InfoBox icon="eye-off-outline">Ваши измерения, тренировки, питание и фотографии видны только вам — доступ ограничен правилами базы данных на уровне строк.</InfoBox>
          <InfoBox icon="images-outline">Фотографии прогресса хранятся в закрытом хранилище и открываются по временным ссылкам.</InfoBox>
          <InfoBox icon="trash-outline">Вы можете удалить аккаунт и все связанные данные в разделе «Аккаунт».</InfoBox>
        </View>
        <Button title="Политика конфиденциальности" variant="secondary" onPress={() => { setPrivacyOpen(false); router.push({ pathname: '/legal', params: { doc: 'privacy' } }); }} />
      </Sheet>
    </Screen>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <T v="bodyM" style={{ fontSize: 16 }}>
        {value}
      </T>
      <T v="caption" style={{ fontSize: 12 }}>
        {label}
      </T>
    </View>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <T v="caption" style={{ fontSize: 14 }}>
        {label}
      </T>
      <T v="bodyM" style={{ fontSize: 14, flexShrink: 1, textAlign: 'right' }}>
        {value}
      </T>
    </View>
  );
}
