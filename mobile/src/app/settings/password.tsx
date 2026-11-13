import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Field } from '@/components/Field';
import { Button, EmptyState, ErrorText, Header, Screen, T } from '@/components/ui';
import { humanError, supabase } from '@/lib/supabase';
import { newPasswordSchema, type NewPasswordForm } from '@/lib/validation';
import { space } from '@/theme';

export default function ChangePassword() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<NewPasswordForm>({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: '', confirm: '' } });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const { error: authError } = await supabase.auth.updateUser({ password: v.password });
    if (authError) setError(humanError(authError));
    else setDone(true);
  });

  if (done) {
    return (
      <Screen edges={['top', 'bottom']} header={<Header title="Изменение пароля" />} footer={<Button title="Готово" onPress={() => router.back()} />}>
        <EmptyState icon="checkmark-circle-outline" title="Пароль изменён" text="Используйте новый пароль при следующем входе." />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']} header={<Header title="Изменение пароля" />} footer={<Button title="Сохранить пароль" onPress={onSubmit} loading={isSubmitting} />}>
      <T v="caption" style={{ marginBottom: space.xl, fontSize: 14 }}>
        Придумайте новый пароль: минимум 8 символов, буквы и цифры.
      </T>
      <ErrorText>{error}</ErrorText>
      <Field control={control} name="password" label="Новый пароль" password autoCapitalize="none" autoComplete="new-password" />
      <Field control={control} name="confirm" label="Подтверждение пароля" password autoCapitalize="none" autoComplete="new-password" />
    </Screen>
  );
}
