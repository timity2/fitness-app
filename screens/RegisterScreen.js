
import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';
import { saveUser } from '../services/userStorage';

export default function RegisterScreen() {
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing information', 'Please fill in all fields.');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email.');
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Weak password',
        'Password must be at least 6 characters.'
      );
      return;
    }

    setLoading(true);

    try {
      const user = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        createdAt: new Date().toISOString(),
      };

      const saved = await saveUser(user);

      if (!saved) {
        Alert.alert('Error', 'Could not save your account.');
        return;
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>FITNESS</Text>
      <Text style={styles.subtitle}>START YOUR JOURNEY</Text>

      <View style={styles.form}>
        <Text style={styles.title}>CREATE ACCOUNT</Text>

        <Text style={styles.description}>
          Join us and build your stronger self.
        </Text>

        <Input
          label="FULL NAME"
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
        />

        <Input
          label="EMAIL"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <Input
          label="PASSWORD"
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button
          title={loading ? 'CREATING...' : 'CREATE ACCOUNT'}
          onPress={handleRegister}
          disabled={loading}
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
