// Создание нового пароля после перехода по ссылке из письма.
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Field } from '@/components/Field';
import { Button, EmptyState, ErrorText, Header, Screen, T } from '@/components/ui';
import { humanError, supabase } from '@/lib/supabase';
import { newPasswordSchema, type NewPasswordForm } from '@/lib/validation';
import { useAuth } from '@/store/auth';
import { space } from '@/theme';

export default function NewPassword() {
  const session = useAuth((s) => s.session);
  const setRecovery = useAuth((s) => s.setRecovery);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<NewPasswordForm>({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: '', confirm: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const { error: authError } = await supabase.auth.updateUser({ password: values.password });
    if (authError) setError(humanError(authError));
    else setDone(true);
  });

  const cancel = async () => {
    await supabase.auth.signOut();
    setRecovery(false);
  };

  if (done) {
    return (
      <Screen edges={['top', 'bottom']} footer={<Button title="Продолжить" onPress={() => setRecovery(false)} />}>
        <EmptyState icon="checkmark-circle-outline" title="Пароль изменён" text="Новый пароль сохранён. Используйте его при следующем входе." />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen edges={['top', 'bottom']} header={<Header onBack={cancel} />}>
        <EmptyState
          icon="link-outline"
          title="Ссылка недействительна"
          text="Откройте ссылку из письма ещё раз или запросите новую на экране восстановления пароля."
        />
      </Screen>
    );
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      header={<Header onBack={cancel} />}
      footer={<Button title="Сохранить пароль" onPress={onSubmit} loading={isSubmitting} />}
    >
      <T v="h1">Новый пароль</T>
      <T v="caption" style={{ marginTop: 6, marginBottom: space.xl, fontSize: 14 }}>
        Придумайте пароль для аккаунта {session.user.email}
      </T>
      <ErrorText>{error}</ErrorText>
      <Field control={control} name="password" label="Новый пароль" placeholder="Минимум 8 символов, буквы и цифры" password autoCapitalize="none" autoComplete="new-password" />
      <Field control={control} name="confirm" label="Подтверждение пароля" placeholder="Повторите пароль" password autoCapitalize="none" autoComplete="new-password" />
    </Screen>
  );
}
