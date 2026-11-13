import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Field } from '@/components/Field';
import { Logo } from '@/components/Logo';
import { Button, ErrorText, Header, Screen, T } from '@/components/ui';
import { humanError, supabase } from '@/lib/supabase';
import { signInSchema, type SignInForm } from '@/lib/validation';
import { colors, space } from '@/theme';

export default function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    getValues,
    formState: { isSubmitting },
  } = useForm<SignInForm>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: values.email.trim().toLowerCase(),
      password: values.password,
    });
    if (authError) setError(humanError(authError));
    // при успехе сессия сохраняется, а переход выполняет корневой layout
  });

  return (
    <Screen edges={['top', 'bottom']} header={<Header />} footer={<Button title="Войти" onPress={onSubmit} loading={isSubmitting} />}>
      <View style={{ marginTop: space.lg, marginBottom: space.xxl }}>
        <Logo size={44} />
      </View>
      <T v="h1">С возвращением</T>
      <T v="caption" style={{ marginTop: 6, marginBottom: space.xl, fontSize: 14 }}>
        Войдите, чтобы продолжить тренировки
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
      <Field control={control} name="password" label="Пароль" placeholder="Ваш пароль" password autoCapitalize="none" autoComplete="current-password" onSubmitEditing={() => onSubmit()} />
      <T
        v="bodyM"
        color={colors.pink}
        style={{ alignSelf: 'flex-end', fontSize: 14 }}
        onPress={() => router.push({ pathname: '/(auth)/forgot-password', params: { email: getValues('email') } })}
      >
        Забыли пароль?
      </T>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: space.xxl, gap: 6 }}>
        <T v="caption" style={{ fontSize: 14 }}>
          Нет аккаунта?
        </T>
        <T v="bodyM" color={colors.pink} style={{ fontSize: 14 }} onPress={() => router.replace('/(auth)/sign-up')}>
          Зарегистрироваться
        </T>
      </View>
    </Screen>
  );
}
