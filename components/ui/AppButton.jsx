
import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';

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
      textColor: '#000000',
    },
    secondary: {
      backgroundColor: COLORS.surface,
      borderColor: COLORS.surface,
      textColor: COLORS.text,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: COLORS.primary,
      textColor: COLORS.primary,
    },
    danger: {
      backgroundColor: COLORS.error || '#E53935',
      borderColor: COLORS.error || '#E53935',
      textColor: '#FFFFFF',
    },
  };

  const sizes = {
    sm: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      fontSize: 12,
    },
    md: {
      paddingVertical: 14,
      paddingHorizontal: 18,
      fontSize: 14,
    },
    lg: {
      paddingVertical: 18,
      paddingHorizontal: 22,
      fontSize: 16,
    },
  };

  const colors = variants[variant] || variants.primary;
  const dimensions = sizes[size] || sizes.md;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          paddingVertical: dimensions.paddingVertical,
          paddingHorizontal: dimensions.paddingHorizontal,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
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
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  text: {
    fontWeight: '800',
    textAlign: 'center',
  },
});
