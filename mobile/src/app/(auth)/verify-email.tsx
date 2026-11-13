import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, ErrorText, Header, Screen, T } from '@/components/ui';
import { humanError, supabase } from '@/lib/supabase';
import { colors, space } from '@/theme';

export default function VerifyEmail() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    if (!email) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const { error: authError } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: Linking.createURL('/') } });
    setBusy(false);
    if (authError) setError(humanError(authError));
    else setMessage('Письмо отправлено повторно');
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      header={<Header onBack={() => router.replace('/(auth)/welcome')} />}
      footer={
        <View style={{ gap: space.md }}>
          <Button title="Я подтвердил email — войти" onPress={() => router.replace('/(auth)/sign-in')} />
          <Button title="Отправить письмо ещё раз" variant="secondary" onPress={resend} loading={busy} />
        </View>
      }
    >
      <EmptyState
        icon="mail-unread-outline"
        title="Подтвердите email"
        text={`Мы отправили письмо на ${email ?? 'вашу почту'}. Перейдите по ссылке в письме, чтобы активировать аккаунт.`}
      />
      <ErrorText>{error}</ErrorText>
      {message ? (
        <T v="caption" center color={colors.success}>
          {message}
        </T>
      ) : null}
    </Screen>
  );
}
