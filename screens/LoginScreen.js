
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
} from '../constants/theme';

import AppButton from '../components/ui/AppButton';
import AppInput from '../components/ui/AppInput';

import useUserStore from '../store/useUserStore';
import { authenticateUser } from '../services/userStorage';

export default function LoginScreen() {
  const navigation = useNavigation();
  const login = useUserStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      Alert.alert('Ошибка', 'Введите email и пароль');
      return;
    }

    setLoading(true);

    try {
      const user = await authenticateUser(normalizedEmail, password);

      if (!user) {
        Alert.alert(
          'Ошибка входа',
          'Неверный email или пароль. Проверьте данные и попробуйте снова.'
        );
        return;
      }

      const { password: savedPassword, ...safeUser } = user;

      login(safeUser);
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось выполнить вход.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Welcome to PULSE</Text>
      <Text style={styles.subtitle}>YOUR BODY. YOUR RULES.</Text>

      <View style={styles.form}>
        <Text style={styles.title}>WELCOME BACK</Text>

        <Text style={styles.description}>
          Sign in to continue your fitness journey.
        </Text>

        <AppInput
          label="EMAIL"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <AppInput
          label="PASSWORD"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          isPassword
          autoCapitalize="none"
        />

        <AppButton
          title="SIGN IN"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          size="lg"
        />

        <AppButton
          title="CREATE ACCOUNT"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
          disabled={loading}
          size="lg"
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
    textAlign: 'center',
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
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
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
