
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';

import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
} from '../../constants/theme';

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
  containerStyle,
  inputContainerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  ...restProps
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const borderColor = error
    ? COLORS.error
    : isFocused
      ? COLORS.primary
      : COLORS.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, labelStyle]}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          { borderColor },
          multiline && styles.multilineContainer,
          inputContainerStyle,
        ]}
      >
        {icon ? (
          <View style={styles.icon}>
            {icon}
          </View>
        ) : null}

        <TextInput
          {...restProps}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
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
            inputStyle,
          ]}
          textAlignVertical={multiline ? 'top' : 'center'}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            style={styles.passwordToggle}
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'
            }
          >
            <Text style={styles.eye}>
              {isPasswordVisible ? '◉' : '◎'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.error, errorStyle]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: SPACING.xs + 3,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  inputContainer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  multilineContainer: {
    minHeight: 110,
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm + 4,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    paddingVertical: SPACING.sm + 4,
  },
  multilineInput: {
    minHeight: 85,
    textAlignVertical: 'top',
  },
  icon: {
    marginRight: SPACING.sm + 2,
  },
  passwordToggle: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  eye: {
    color: COLORS.textSecondary,
    fontSize: 20,
  },
  error: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.small - 1,
    fontWeight: '600',
  },
});
