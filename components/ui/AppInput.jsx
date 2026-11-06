
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';

import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';

export default function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  icon,
  isPassword = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  ...restProps
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const borderColor = error
    ? (COLORS.error || '#FF5252')
    : isFocused
      ? COLORS.primary
      : '#333333';

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          { borderColor },
          multiline && styles.multilineContainer,
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}

        <TextInput
          {...restProps}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          secureTextEntry={isPassword && !isPasswordVisible}
          onFocus={(event) => {
            setIsFocused(true);
            restProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            restProps.onBlur?.(event);
          }}
          style={[
            styles.input,
            multiline && styles.multilineInput,
          ]}
          textAlignVertical={multiline ? 'top' : 'center'}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            style={styles.passwordToggle}
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordVisible ? 'Hide password' : 'Show password'
            }
          >
            <Text style={styles.eye}>
              {isPasswordVisible ? '◉' : '◎'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 7,
  },
  label: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  inputContainer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
  },
  multilineContainer: {
    minHeight: 110,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 85,
    textAlignVertical: 'top',
  },
  icon: {
    marginRight: 10,
  },
  passwordToggle: {
    padding: 8,
    marginLeft: 6,
  },
  eye: {
    color: COLORS.textSecondary,
    fontSize: 20,
  },
  error: {
    color: COLORS.error || '#FF5252',
    fontSize: 11,
    fontWeight: '600',
  },
});
