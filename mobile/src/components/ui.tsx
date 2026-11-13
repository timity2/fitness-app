// UI-кит Pulse: единые текст, кнопки, карточки, поля ввода, прогресс и состояния.
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { colors, fonts, gradient, MAX_WIDTH, radius, space } from '@/theme';

const nativeDriver = Platform.OS !== 'web';
export type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ---------- Текст ----------
const textVariants = {
  h1: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.text },
  h2: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, color: colors.text },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.text },
  bodyM: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.text },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.text2 },
  small: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.muted },
  num: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 28, color: colors.text },
} satisfies Record<string, TextStyle>;

export function T({
  v = 'body',
  color,
  center,
  style,
  ...rest
}: TextProps & { v?: keyof typeof textVariants; color?: string; center?: boolean }) {
  return <Text {...rest} style={[textVariants[v], color ? { color } : null, center ? { textAlign: 'center' } : null, style]} />;
}

// ---------- Нажатие с лёгким масштабированием ----------
export function Tap({
  onPress,
  style,
  children,
  disabled,
  label,
  hitSlop,
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  label?: string;
  hitSlop?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: nativeDriver, speed: 40, bounciness: 0 }).start();
  // Стиль применяется к самому Pressable, чтобы flex / width работали как у обычного View
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || !onPress}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={hitSlop}
      style={[style, { transform: [{ scale }] }, disabled ? { opacity: 0.5 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------- Плавное появление ----------
export function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  }, [a, delay]);
  return (
    <Animated.View
      style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

// ---------- Экран ----------
export function Screen({
  children,
  scroll = true,
  header,
  footer,
  padded = true,
  edges = ['top'],
  refreshControl,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padded?: boolean;
  edges?: ('top' | 'bottom')[];
  refreshControl?: React.ReactElement<any>;
}) {
  const insets = useSafeAreaInsets();
  const pad = padded ? { paddingHorizontal: space.xl } : null;
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.column}>
          {header ? <View style={pad}>{header}</View> : null}
          {scroll ? (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[pad, { paddingBottom: space.xxl + (footer ? 0 : 16), paddingTop: space.sm }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              refreshControl={refreshControl}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.flex, pad]}>{children}</View>
          )}
          {footer ? (
            <View style={[pad, { paddingTop: space.md, paddingBottom: Math.max(insets.bottom, space.lg) }]}>{footer}</View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Header({ title, right, onBack, back = true }: { title?: string; right?: React.ReactNode; onBack?: () => void; back?: boolean }) {
  return (
    <View style={styles.header}>
      {back ? (
        <Tap
          label="Назад"
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Tap>
      ) : (
        <View style={{ width: 0 }} />
      )}
      <T v="h3" numberOfLines={1} style={styles.headerTitle}>
        {title}
      </T>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export function IconButton({ icon, onPress, label, color = colors.text, badge }: { icon: IconName; onPress?: () => void; label: string; color?: string; badge?: boolean }) {
  return (
    <Tap onPress={onPress} label={label} style={styles.iconButton}>
      <Ionicons name={icon} size={20} color={color} />
      {badge ? <View style={styles.badge} /> : null}
    </Tap>
  );
}

// ---------- Кнопка ----------
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const height = small ? 44 : 54;
  const textColor = variant === 'ghost' ? colors.pink : variant === 'danger' ? colors.error : colors.text;
  const content = (
    <View style={[styles.buttonInner, { height }]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={textColor} style={{ marginRight: 8 }} /> : null}
          <Text style={{ fontFamily: fonts.semibold, fontSize: small ? 14 : 16, color: textColor }} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </View>
  );
  return (
    <Tap onPress={loading ? undefined : onPress} disabled={disabled} label={title} style={[{ borderRadius: radius.md, overflow: 'hidden' }, style]}>
      {variant === 'primary' ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={
            variant === 'ghost'
              ? null
              : { backgroundColor: colors.card2, borderWidth: 1, borderColor: variant === 'danger' ? 'rgba(255,82,99,0.35)' : colors.borderStrong, borderRadius: radius.md }
          }
        >
          {content}
        </View>
      )}
    </Tap>
  );
}

// ---------- Карточка ----------
export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Tap onPress={onPress} style={[styles.card, style]}>
        {children}
      </Tap>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <T v="h3" style={{ fontSize: 19 }}>
        {title}
      </T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} style={styles.rowCenter}>
          <T v="bodyM" color={colors.pink} style={{ fontSize: 14 }}>
            {action}
          </T>
          <Ionicons name="chevron-forward" size={15} color={colors.pink} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------- Поле ввода ----------
export function Input({
  label,
  error,
  suffix,
  password,
  containerStyle,
  style,
  onFocus,
  onBlur,
  multiline,
  ...rest
}: TextInputProps & { label?: string; error?: string; suffix?: string; password?: boolean; containerStyle?: StyleProp<ViewStyle> }) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!password);
  return (
    <View style={[{ marginBottom: space.md }, containerStyle]}>
      {label ? (
        <T v="caption" style={{ marginBottom: 6 }}>
          {label}
        </T>
      ) : null}
      <View
        style={[
          styles.inputBox,
          multiline ? { height: undefined, minHeight: 96, alignItems: 'flex-start', paddingVertical: 12 } : null,
          focused ? { borderColor: colors.pink } : null,
          error ? { borderColor: colors.error } : null,
        ]}
      >
        <TextInput
          {...rest}
          multiline={multiline}
          secureTextEntry={hidden}
          placeholderTextColor={colors.muted}
          selectionColor={colors.pink}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline ? { textAlignVertical: 'top', minHeight: 72 } : null, style]}
        />
        {suffix ? <T v="caption">{suffix}</T> : null}
        {password ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Показать пароль' : 'Скрыть пароль'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.text2} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <T v="caption" color={colors.error} style={{ marginTop: 5 }}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

// ---------- Чипы и сегменты ----------
export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active ? { backgroundColor: colors.pinkSoft, borderColor: colors.pink } : null]}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? colors.pink : colors.text2} style={{ marginRight: 6 }} /> : null}
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: active ? colors.pinkLight : colors.text2 }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, active ? { backgroundColor: colors.card2 } : null]}>
            <Text style={{ fontFamily: active ? fonts.semibold : fonts.medium, fontSize: 13, color: active ? colors.text : colors.text2 }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Карточка выбора с радио-индикатором (анкета, настройки) */
export function OptionCard({ title, subtitle, icon, selected, onPress }: { title: string; subtitle?: string; icon?: IconName; selected: boolean; onPress: () => void }) {
  return (
    <Tap onPress={onPress} style={[styles.card, styles.option, selected ? { borderColor: colors.pink, backgroundColor: '#1E1721' } : null]}>
      {icon ? (
        <View style={[styles.optionIcon, selected ? { backgroundColor: colors.pinkSoft } : null]}>
          <Ionicons name={icon} size={20} color={selected ? colors.pink : colors.text2} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <T v="bodyM">{title}</T>
        {subtitle ? <T v="caption">{subtitle}</T> : null}
      </View>
      <View style={[styles.radio, selected ? { borderColor: colors.pink } : null]}>{selected ? <View style={styles.radioDot} /> : null}</View>
    </Tap>
  );
}

// ---------- Прогресс ----------
export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(1, value || 0));
  useEffect(() => {
    Animated.timing(a, { toValue: clamped, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [a, clamped]);
  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.card2, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height, width: a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), overflow: 'hidden' }}>
        {color ? (
          <View style={{ flex: 1, backgroundColor: color }} />
        ) : (
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.flex} />
        )}
      </Animated.View>
    </View>
  );
}

/** Кольцевой индикатор с фирменным градиентом */
export function Ring({ size, stroke, value, children, trackColor = colors.card2 }: { size: number; stroke: number; value: number; children?: React.ReactNode; trackColor?: string }) {
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const a = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  const clamped = Math.max(0, Math.min(1, value || 0));
  // Значение анимируется через состояние: анимированный SVG-элемент в вебе
  // получает служебные атрибуты и вызывает предупреждения React.
  useEffect(() => {
    const id = a.addListener(({ value: v }) => setShown(v));
    Animated.timing(a, { toValue: clamped, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => a.removeListener(id);
  }, [a, clamped]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.pinkLight} />
            <Stop offset="1" stopColor={colors.crimson} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length} ${length}`}
          strokeDashoffset={length * (1 - shown)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

// ---------- Состояния ----------
export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.pink} size="large" />
      {label ? (
        <T v="caption" style={{ marginTop: space.md }}>
          {label}
        </T>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon = 'sparkles-outline', title, text, action, onAction }: { icon?: IconName; title: string; text?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={26} color={colors.pink} />
      </View>
      <T v="h3" center>
        {title}
      </T>
      {text ? (
        <T v="caption" center style={{ marginTop: 6, maxWidth: 300 }}>
          {text}
        </T>
      ) : null}
      {action ? <Button title={action} onPress={onAction} small style={{ marginTop: space.lg, minWidth: 180 }} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.state}>
      <View style={[styles.stateIcon, { backgroundColor: 'rgba(255,82,99,0.12)' }]}>
        <Ionicons name="cloud-offline-outline" size={26} color={colors.error} />
      </View>
      <T v="h3" center>
        Не удалось загрузить данные
      </T>
      <T v="caption" center style={{ marginTop: 6, maxWidth: 300 }}>
        {message ?? 'Проверьте подключение к интернету и попробуйте снова.'}
      </T>
      {onRetry ? <Button title="Повторить" variant="secondary" onPress={onRetry} small style={{ marginTop: space.lg, minWidth: 160 }} /> : null}
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={18} color={colors.error} />
      <T v="caption" color={colors.error} style={styles.flex}>
        {children}
      </T>
    </View>
  );
}

export function InfoBox({ children, icon = 'information-circle-outline' }: { children: React.ReactNode; icon?: IconName }) {
  return (
    <View style={styles.infoBox}>
      <Ionicons name={icon} size={18} color={colors.text2} />
      <T v="caption" style={styles.flex}>
        {children}
      </T>
    </View>
  );
}

// ---------- Строка настроек ----------
export function Row({
  icon,
  title,
  value,
  onPress,
  danger,
  right,
  last,
}: {
  icon?: IconName;
  title: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.row, last ? { borderBottomWidth: 0 } : null]}>
      {icon ? (
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={18} color={danger ? colors.error : colors.pink} />
        </View>
      ) : null}
      <T v="bodyM" color={danger ? colors.error : colors.text} style={styles.flex} numberOfLines={1}>
        {title}
      </T>
      {value ? (
        <T v="caption" numberOfLines={1} style={{ maxWidth: 170 }}>
          {value}
        </T>
      ) : null}
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={17} color={colors.muted} style={{ marginLeft: 6 }} /> : null}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

// ---------- Нижняя панель (модальная) ----------
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Закрыть" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.xl) }]}>
          <View style={styles.sheetHandle} />
          {title ? (
            <View style={styles.sheetHeader}>
              <T v="h3" style={styles.flex}>
                {title}
              </T>
              <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Закрыть">
                <Ionicons name="close" size={22} color={colors.text2} />
              </Pressable>
            </View>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Диалоги ----------
export function confirm(title: string, message: string, onYes: () => void, yesLabel = 'Подтвердить', destructive = false) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Отмена', style: 'cancel' },
    { text: yesLabel, style: destructive ? 'destructive' : 'default', onPress: onYes },
  ]);
}

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  header: { height: 56, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', marginHorizontal: space.sm },
  headerRight: { minWidth: 40, alignItems: 'flex-end' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.pink },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  inputBox: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
    padding: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmented: { flexDirection: 'row', backgroundColor: colors.bg2, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: colors.border },
  segment: { flex: 1, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md, paddingVertical: 14 },
  optionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.pink },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, paddingHorizontal: space.lg },
  stateIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,82,99,0.1)',
    borderRadius: radius.sm,
    padding: space.md,
    marginBottom: space.md,
  },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: colors.bg2, borderRadius: radius.sm, padding: space.md, borderWidth: 1, borderColor: colors.border },
  row: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  sheetRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.bg2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    maxHeight: '88%',
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.card2, alignSelf: 'center', marginBottom: space.md },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
});
