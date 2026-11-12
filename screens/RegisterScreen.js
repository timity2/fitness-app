
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
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
import { saveUser } from '../services/userStorage';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const login = useUserStore((state) => state.login);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!name.trim() || !normalizedEmail || !password.trim()) {
      Alert.alert('Ошибка', 'Заполните все поля.');
      return;
    }

    if (!normalizedEmail.includes('@')) {
      Alert.alert('Некорректный email', 'Введите правильный email.');
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Слабый пароль',
        'Пароль должен содержать минимум 6 символов.'
      );
      return;
    }

    setLoading(true);

    try {
      const user = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: normalizedEmail,
        password,
        goal: 'BUILD MUSCLE',
        weeklyTarget: 5,
        fitnessLevel: 'INTERMEDIATE',
        createdAt: new Date().toISOString(),
      };

      const saved = await saveUser(user);

      if (!saved) {
        Alert.alert('Ошибка', 'Не удалось сохранить аккаунт.');
        return;
      }

      const { password: savedPassword, ...safeUser } = user;

      login(safeUser);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error) {
      Alert.alert(
        'Ошибка',
        'Регистрация не удалась. Попробуйте ещё раз.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.logo}>PULSE</Text>
      <Text style={styles.subtitle}>START YOUR JOURNEY</Text>

      <View style={styles.form}>
        <Text style={styles.title}>CREATE ACCOUNT</Text>

        <Text style={styles.description}>
          Join us and build your stronger self.
        </Text>

        <AppInput
          label="FULL NAME"
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={50}
        />

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
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
          isPassword
          autoCapitalize="none"
        />

        <AppButton
          title="CREATE ACCOUNT"
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
          size="lg"
        />

        <Text
          style={styles.back}
          onPress={() => navigation.navigate('Login')}
        >
          ALREADY HAVE AN ACCOUNT? SIGN IN
        </Text>
      </View>

      <Text style={styles.footer}>
        TRAIN HARD. STAY STRONG.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
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
  back: {
    color: COLORS.primary,
    fontSize: 11,
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
