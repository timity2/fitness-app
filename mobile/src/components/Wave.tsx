// Декоративная розовая «волна» из референса (шапка главной, экран приветствия).
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/theme';

export function Wave({ style, width = 260, height = 130 }: { style?: StyleProp<ViewStyle>; width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 260 130" style={style} pointerEvents="none">
      <Defs>
        <LinearGradient id="wave" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.pink} stopOpacity={0} />
          <Stop offset="0.6" stopColor={colors.pink} stopOpacity={0.55} />
          <Stop offset="1" stopColor={colors.crimson} stopOpacity={0.9} />
        </LinearGradient>
        <LinearGradient id="waveFill" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.crimson} stopOpacity={0} />
          <Stop offset="1" stopColor={colors.crimson} stopOpacity={0.28} />
        </LinearGradient>
      </Defs>
      <Path d="M20 118 C 90 112, 130 70, 180 48 S 240 18, 262 8 L 262 70 C 220 62, 170 86, 120 108 S 50 124, 20 118 Z" fill="url(#waveFill)" />
      <Path d="M10 120 C 90 116, 130 72, 180 50 S 240 20, 262 10" stroke="url(#wave)" strokeWidth={1.4} fill="none" />
      <Path d="M30 126 C 100 118, 150 92, 195 70 S 245 44, 262 40" stroke="url(#wave)" strokeWidth={1} fill="none" opacity={0.7} />
      <Path d="M60 128 C 120 122, 165 104, 205 88 S 250 66, 262 62" stroke="url(#wave)" strokeWidth={0.8} fill="none" opacity={0.45} />
    </Svg>
  );
}
