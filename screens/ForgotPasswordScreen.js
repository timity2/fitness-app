
import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = () => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      Alert.alert(
        'Request received',
        'Password reset will be available after connecting the authentication server.',
        [
          {
            text: 'BACK TO LOGIN',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    }, 500);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>FITNESS</Text>

      <View style={styles.form}>
        <Text style={styles.title}>FORGOT PASSWORD?</Text>

        <Text style={styles.description}>
          Enter your email address and we'll help you reset your password.
        </Text>

        <Input
          label="EMAIL"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <Button
          title={loading ? 'PLEASE WAIT...' : 'RESET PASSWORD'}
          onPress={handleReset}
          disabled={loading}
        />

        <Text
          style={styles.back}
          onPress={() => navigation.navigate('Login')}
        >
          BACK TO LOGIN
        </Text>
      </View>

      <Text style={styles.footer}>TRAIN HARD. STAY STRONG.</Text>
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
    lineHeight: 21,
  },
  back: {
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
