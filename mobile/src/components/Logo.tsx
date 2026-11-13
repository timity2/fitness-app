// Логотип Pulse, воссозданный в векторе по референсу: наклонная «P» с линией пульса.
// Чтобы использовать исходный файл логотипа, замените содержимое LogoMark на <Image source={...} />.
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, fonts } from '@/theme';

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="logo" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.pinkLight} />
          <Stop offset="0.45" stopColor={colors.pink} />
          <Stop offset="1" stopColor={colors.crimson} />
        </LinearGradient>
      </Defs>
      <G transform="translate(6 0) skewX(-10)">
        <Path
          d="M18 43 V9 H30 a10.5 10.5 0 0 1 0 21 H25"
          stroke="url(#logo)"
          strokeWidth={7.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* тёмная подложка «прорезает» букву под линией пульса */}
        <Path d="M3 27 H12 L16.5 18 L22 35 L26 25 H33" stroke={colors.bg} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M3 27 H12 L16.5 18 L22 35 L26 25 H33" stroke={colors.pink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </G>
    </Svg>
  );
}

export function Logo({ size = 40, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityRole="image" accessibilityLabel="Pulse">
      <LogoMark size={size} />
      {wordmark ? (
        <Text style={{ fontFamily: fonts.boldItalic, fontSize: size * 0.72, color: colors.text, marginLeft: size * 0.12, letterSpacing: -0.5 }}>
          Pulse
        </Text>
      ) : null}
    </View>
  );
}
