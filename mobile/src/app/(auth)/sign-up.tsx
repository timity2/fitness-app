import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { Field } from '@/components/Field';
import { Button, ErrorText, Header, Screen, T } from '@/components/ui';
import { humanError, supabase } from '@/lib/supabase';
import { signUpSchema, type SignUpForm } from '@/lib/validation';
import { colors, space } from '@/theme';

export default function SignUp() {
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { first_name: '', last_name: '', email: '', password: '', confirm: '', terms: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const email = values.email.trim().toLowerCase();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password: values.password,
      options: {
        data: { first_name: values.first_name.trim(), last_name: values.last_name.trim() },
        emailRedirectTo: Linking.createURL('/'),
      },
    });
    if (authError) {
      setError(humanError(authError));
      return;
    }
    // Если в проекте включено подтверждение email, сессии ещё нет — показываем инструкцию
    if (!data.session) router.replace({ pathname: '/(auth)/verify-email', params: { email } });
  });

  return (
    <Screen
      edges={['top', 'bottom']}
      header={<Header />}
      footer={<Button title="Зарегистрироваться" onPress={onSubmit} loading={isSubmitting} />}
    >
      <T v="h1">Создание аккаунта</T>
      <T v="caption" style={{ marginTop: 6, marginBottom: space.xl, fontSize: 14 }}>
        Заполните данные, чтобы начать пользоваться Pulse
      </T>
      <ErrorText>{error}</ErrorText>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Field control={control} name="first_name" label="Имя" placeholder="Анна" autoCapitalize="words" autoComplete="given-name" />
        </View>
        <View style={{ flex: 1 }}>
          <Field control={control} name="last_name" label="Фамилия" placeholder="Иванова" autoCapitalize="words" autoComplete="family-name" />
        </View>
      </View>
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
      <Field control={control} name="password" label="Пароль" placeholder="Минимум 8 символов, буквы и цифры" password autoCapitalize="none" autoComplete="new-password" />
      <Field control={control} name="confirm" label="Подтверждение пароля" placeholder="Повторите пароль" password autoCapitalize="none" autoComplete="new-password" />

      <Controller
        control={control}
        name="terms"
        render={({ field: { value, onChange }, fieldState: { error: fieldError } }) => (
          <View style={{ marginTop: space.xs }}>
            <Pressable
              onPress={() => onChange(!value)}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: value }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  borderWidth: 1.5,
                  borderColor: fieldError ? colors.error : value ? colors.pink : colors.muted,
                  backgroundColor: value ? colors.pink : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {value ? <Ionicons name="checkmark" size={16} color={colors.text} /> : null}
              </View>
              <T v="caption" style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
                Я принимаю{' '}
                <T v="caption" color={colors.pink} style={{ fontSize: 14 }} onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })}>
                  условия использования
                </T>{' '}
                и{' '}
                <T v="caption" color={colors.pink} style={{ fontSize: 14 }} onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })}>
                  политику конфиденциальности
                </T>
              </T>
            </Pressable>
            {fieldError ? (
              <T v="caption" color={colors.error} style={{ marginTop: 6 }}>
                {fieldError.message}
              </T>
            ) : null}
          </View>
        )}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: space.xxl, gap: 6 }}>
        <T v="caption" style={{ fontSize: 14 }}>
          Уже есть аккаунт?
        </T>
        <T v="bodyM" color={colors.pink} style={{ fontSize: 14 }} onPress={() => router.replace('/(auth)/sign-in')}>
          Войти
        </T>
      </View>
    </Screen>
  );
}
