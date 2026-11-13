
import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import {
  COLORS,
  RADIUS,
  SHADOWS,
} from '../../constants/theme';

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon = null,
  style,
}) {
  const isDisabled = disabled || loading;

  const variants = {
    primary: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
      textColor: COLORS.background,
    },
    secondary: {
      backgroundColor: COLORS.surfaceLight,
      borderColor: COLORS.surfaceLight,
      textColor: COLORS.text,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: COLORS.primary,
      textColor: COLORS.primary,
    },
    danger: {
      backgroundColor: COLORS.error,
      borderColor: COLORS.error,
      textColor: '#FFFFFF',
    },
  };

  const sizes = {
    sm: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      fontSize: 12,
      minHeight: 38,
    },
    md: {
      paddingVertical: 14,
      paddingHorizontal: 18,
      fontSize: 14,
      minHeight: 48,
    },
    lg: {
      paddingVertical: 17,
      paddingHorizontal: 22,
      fontSize: 16,
      minHeight: 56,
    },
  };

  const colors = variants[variant] || variants.primary;
  const dimensions = sizes[size] || sizes.md;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          paddingVertical: dimensions.paddingVertical,
          paddingHorizontal: dimensions.paddingHorizontal,
          minHeight: dimensions.minHeight,
          opacity: isDisabled ? 0.45 : pressed ? 0.8 : 1,
        },
        variant === 'primary' && !isDisabled && styles.primaryShadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textColor} />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.text,
              {
                color: colors.textColor,
                fontSize: dimensions.fontSize,
              },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryShadow: {
    shadowColor: SHADOWS.neon.shadowColor,
    shadowOffset: SHADOWS.neon.shadowOffset,
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 3,
  },
  text: {
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
});
