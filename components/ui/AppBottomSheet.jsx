
import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
} from '../../constants/theme';

export default function AppBottomSheet({
  visible,
  onClose,
  title,
  children,
}) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    let animation;

    if (visible) {
      animation = Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 60,
          friction: 11,
          useNativeDriver: true,
        }),
      ]);

      animation.start();
    } else {
      backdropOpacity.setValue(0);
      translateY.setValue(500);
    }

    return () => {
      animation?.stop();
    };
  }, [visible, backdropOpacity, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Закрыть панель"
        >
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropOpacity },
            ]}
          />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY }] },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.header}>
              <View style={styles.handle} />

              <View style={styles.titleRow}>
                <Text style={styles.title}>
                  {title}
                </Text>

                <Pressable
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Закрыть панель"
                >
                  <Text style={styles.closeText}>×</Text>
                </Pressable>
              </View>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '85%',
    minHeight: 180,
    overflow: 'hidden',
    elevation: 15,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.muted,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '900',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  closeText: {
    color: COLORS.text,
    fontSize: 25,
    lineHeight: 28,
  },
  body: {
    paddingHorizontal: SPACING.lg,
  },
  bodyContent: {
    paddingBottom: SPACING.xxl,
  },
});
