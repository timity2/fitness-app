
import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';

import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';

export default function AppModal({
  visible,
  onClose,
  title,
  children,
}) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(contentTranslate, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      contentTranslate.setValue(30);
    }
  }, [visible, backdropOpacity, contentTranslate]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropOpacity },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.content,
            { transform: [{ translateY: contentTranslate }] },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.handle} />

            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>

              <Pressable
                onPress={onClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.body}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  content: {
    width: '90%',
    maxWidth: 480,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 10,
    backgroundColor: '#666666',
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#292929',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: COLORS.text,
    fontSize: 25,
    lineHeight: 28,
  },
  body: {
    padding: SPACING.lg,
  },
});
