
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';

export default function LoginScreen() {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Welcome to PULSE
      </Text>
      <Text style={styles.subtitle}>YOUR BODY. YOUR RULES.</Text>

      <View style={styles.form}>
        <Text style={styles.title}>WELCOME BACK</Text>

        <Text style={styles.description}>
          Sign in to continue your fitness journey.
        </Text>

        <Input
          label="EMAIL"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <Input
          label="PASSWORD"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button
          title="SIGN IN"
          onPress={() => navigation.replace('Main')}
        />

        <Button
          title="CREATE ACCOUNT"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
        />

        <Text
          style={styles.forgot}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          FORGOT PASSWORD?
        </Text>
      </View>

      <Text style={styles.footer}>
        TRAIN HARD. STAY STRONG.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  logo: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.display,
    fontWeight: '900',
    letterSpacing: 5,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    letterSpacing: 3,
    marginTop: SPACING.sm,
  },
  form: {
    width: '100%',
    marginTop: SPACING.xxl,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 20,
    gap: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    fontWeight: '900',
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body,
  },
  forgot: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  footer: {
    color: COLORS.primary,
    fontSize: 10,
    letterSpacing: 2,
    marginTop: SPACING.xxl,
  },
});
