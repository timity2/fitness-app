// Графики на react-native-svg: линейный (с заливкой) и столбчатый.
import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { FadeIn, T } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import { colors, fonts } from '@/theme';

export interface ChartPoint {
  label: string;
  value: number;
}

const PAD = { top: 14, right: 12, bottom: 24, left: 38 };

function useWidth() {
  const [width, setWidth] = useState(0);
  return { width, onLayout: (e: { nativeEvent: { layout: { width: number } } }) => setWidth(e.nativeEvent.layout.width) };
}

const niceLabel = (v: number) => (Math.abs(v) >= 1000 ? `${formatNumber(v / 1000, 1)}к` : formatNumber(v, v % 1 === 0 ? 0 : 1));

function labelIndexes(n: number, max = 5) {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const step = (n - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => Math.round(i * step));
}

function Empty({ height, text }: { height: number; text: string }) {
  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
      <T v="caption" center>
        {text}
      </T>
    </View>
  );
}

export function LineChart({ data, height = 180, emptyText = 'Пока нет данных за выбранный период' }: { data: ChartPoint[]; height?: number; emptyText?: string }) {
  const { width, onLayout } = useWidth();
  if (data.length === 0) return <Empty height={height} text={emptyText} />;

  const values = data.map((d) => d.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.12;
  max += span * 0.12;

  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v: number) => PAD.top + h - ((v - min) / (max - min)) * h;
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${PAD.top + h} L${x(0).toFixed(1)} ${PAD.top + h} Z`;
  const ticks = [0, 0.5, 1].map((t) => min + (max - min) * t);

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 ? (
        <FadeIn>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.pink} stopOpacity={0.35} />
                <Stop offset="1" stopColor={colors.pink} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {ticks.map((t, i) => (
              <React.Fragment key={i}>
                <Line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} />
                <SvgText x={PAD.left - 8} y={y(t) + 4} fill={colors.muted} fontSize={10} fontFamily={fonts.regular} textAnchor="end">
                  {niceLabel(t)}
                </SvgText>
              </React.Fragment>
            ))}
            {data.length > 1 ? <Path d={area} fill="url(#area)" /> : null}
            {data.length > 1 ? <Path d={line} stroke={colors.pink} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
            {data.map((d, i) =>
              data.length <= 14 || i === data.length - 1 ? (
                <Circle key={i} cx={x(i)} cy={y(d.value)} r={i === data.length - 1 ? 4.5 : 3} fill={colors.bg} stroke={colors.pinkLight} strokeWidth={2} />
              ) : null,
            )}
            {labelIndexes(data.length).map((i) => (
              <SvgText
                key={i}
                x={x(i)}
                y={height - 6}
                fill={colors.muted}
                fontSize={10}
                fontFamily={fonts.regular}
                textAnchor={data.length === 1 ? 'middle' : i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
              >
                {data[i].label}
              </SvgText>
            ))}
          </Svg>
        </FadeIn>
      ) : null}
    </View>
  );
}

export function BarChart({ data, height = 170, emptyText = 'Пока нет данных за выбранный период', highlightLast = false }: { data: ChartPoint[]; height?: number; emptyText?: string; highlightLast?: boolean }) {
  const { width, onLayout } = useWidth();
  if (data.length === 0 || data.every((d) => d.value === 0)) return <Empty height={height} text={emptyText} />;

  const max = Math.max(...data.map((d) => d.value), 1);
  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const slot = w / data.length;
  const bar = Math.min(26, slot * 0.6);
  const labels = new Set(labelIndexes(data.length, 7));

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 ? (
        <FadeIn>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.pink} />
                <Stop offset="1" stopColor={colors.crimson} />
              </LinearGradient>
            </Defs>
            {[0.5, 1].map((t) => (
              <React.Fragment key={t}>
                <Line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + h - h * t} y2={PAD.top + h - h * t} stroke={colors.border} strokeWidth={1} />
                <SvgText x={PAD.left - 8} y={PAD.top + h - h * t + 4} fill={colors.muted} fontSize={10} fontFamily={fonts.regular} textAnchor="end">
                  {niceLabel(max * t)}
                </SvgText>
              </React.Fragment>
            ))}
            {data.map((d, i) => {
              const bh = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * h);
              const cx = PAD.left + slot * i + slot / 2;
              return (
                <React.Fragment key={i}>
                  <Rect x={cx - bar / 2} y={PAD.top} width={bar} height={h} rx={Math.min(6, bar / 2)} fill={colors.card2} opacity={0.5} />
                  <Rect
                    x={cx - bar / 2}
                    y={PAD.top + h - bh}
                    width={bar}
                    height={bh}
                    rx={Math.min(6, bar / 2)}
                    fill="url(#bar)"
                    opacity={highlightLast && i !== data.length - 1 ? 0.55 : 1}
                  />
                  {labels.has(i) ? (
                    <SvgText x={cx} y={height - 6} fill={colors.muted} fontSize={10} fontFamily={fonts.regular} textAnchor="middle">
                      {d.label}
                    </SvgText>
                  ) : null}
                </React.Fragment>
              );
            })}
          </Svg>
        </FadeIn>
      ) : null}
    </View>
  );
}
