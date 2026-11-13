import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Field } from '@/components/Field';
import { Button, EmptyState, ErrorText, Header, InfoBox, Screen, T } from '@/components/ui';
import { demoResetPassword, humanError, isDemo, supabase } from '@/lib/supabase';
import { emailSchema, passwordSchema } from '@/lib/validation';
import { space } from '@/theme';

// В демо-режиме почтового сервера нет, поэтому новый пароль задаётся сразу на этом экране.
const schema = z.object({ email: emailSchema, password: isDemo ? passwordSchema : z.string().optional() });
type Form = z.infer<typeof schema>;

export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: params.email ?? '', password: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const email = values.email.trim().toLowerCase();
    if (isDemo) {
      const { error: demoError } = await demoResetPassword(email, values.password ?? '');
      if (demoError) setError(demoError.message);
      else setSentTo(email);
      return;
    }
    // Ссылка из письма откроет приложение на экране создания нового пароля (pulse://new-password)
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: Linking.createURL('/new-password') });
    if (authError) setError(humanError(authError));
    else setSentTo(email);
  });

  if (sentTo) {
    return (
      <Screen edges={['top', 'bottom']} header={<Header />} footer={<Button title="Вернуться ко входу" onPress={() => router.replace('/(auth)/sign-in')} />}>
        <EmptyState
          icon={isDemo ? 'checkmark-circle-outline' : 'mail-outline'}
          title={isDemo ? 'Пароль изменён' : 'Письмо отправлено'}
          text={
            isDemo
              ? 'Теперь вы можете войти с новым паролем.'
              : `Если аккаунт ${sentTo} существует, на почту придёт ссылка для создания нового пароля. Откройте её на этом устройстве.`
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      header={<Header />}
      footer={<Button title={isDemo ? 'Сохранить новый пароль' : 'Отправить ссылку'} onPress={onSubmit} loading={isSubmitting} />}
    >
      <T v="h1">Восстановление пароля</T>
      <T v="caption" style={{ marginTop: 6, marginBottom: space.xl, fontSize: 14 }}>
        {isDemo ? 'Укажите email аккаунта и новый пароль' : 'Укажите email — мы отправим ссылку для создания нового пароля'}
      </T>
      <ErrorText>{error}</ErrorText>
      <Field
        control={control}
        name="email"
        label="Email"
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
      />
      {isDemo ? (
        <>
          <Field control={control} name="password" label="Новый пароль" placeholder="Минимум 8 символов, буквы и цифры" password autoCapitalize="none" />
          <InfoBox>Демо-режим: письмо не отправляется, пароль меняется сразу на этом устройстве.</InfoBox>
        </>
      ) : null}
    </Screen>
  );
}
