import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { colors, fonts } from '@/theme';
import { formatDecimal, formatNumber, shortDate } from '@/utils/format';

export interface ChartPoint {
  date: string;
  value: number;
}

function useWidth() {
  const [width, setWidth] = useState(0);
  return { width, onLayout: (e: { nativeEvent: { layout: { width: number } } }) => setWidth(Math.floor(e.nativeEvent.layout.width)) };
}

function niceRange(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const raw = Math.max(1, (max - min) / 2);
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500].find((s) => s >= raw) ?? 1000;
  const lo = Math.floor(min / step) * step;
  let hi = Math.ceil(max / step) * step;
  if (hi === lo) hi = lo + step;
  return { lo, hi, step };
}

// Linha do melhor 1RM por treino, com eixo Y (3 marcas), datas no eixo X e o último ponto destacado.
export function LineChart({ points, height = 170, highlight, label }: { points: ChartPoint[]; height?: number; highlight: string; label: string }) {
  const { width, onLayout } = useWidth();
  const left = 30;
  const top = 20;
  const bottom = height - 20;
  const values = points.map((p) => p.value);
  const { lo, hi, step } = niceRange(values);
  const ticks: number[] = [];
  for (let v = hi; v >= lo; v -= step) ticks.push(v);
  const y = (v: number) => top + ((hi - v) / (hi - lo || 1)) * (bottom - 10 - top);
  const innerLeft = left + 10;
  const innerRight = width - 12;
  const x = (i: number) => (points.length === 1 ? (innerLeft + innerRight) / 2 : innerLeft + (i / (points.length - 1)) * (innerRight - innerLeft));
  const last = points[points.length - 1];
  const isPr = last && last.value >= Math.max(...values);
  const mid = Math.floor((points.length - 1) / 2);

  return (
    <View onLayout={onLayout} style={{ height }} accessibilityRole="image" accessibilityLabel={label}>
      {width > 0 && points.length > 0 ? (
        <Svg width={width} height={height}>
          {ticks.map((t) => (
            <Line key={t} x1={left} y1={y(t)} x2={width} y2={y(t)} stroke={colors.divider} strokeWidth={1} />
          ))}
          <Line x1={left} y1={bottom} x2={width} y2={bottom} stroke={colors.borderInput} strokeWidth={1} />
          {ticks.map((t) => (
            <SvgText key={`l${t}`} x={0} y={y(t) + 4} fill={colors.textMuted} fontSize={10} fontFamily={fonts.medium}>
              {formatNumber(t)}
            </SvgText>
          ))}
          {points.length > 1 ? (
            <Polyline
              points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
              fill="none"
              stroke={colors.accent}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {points.slice(0, -1).map((p, i) => (
            <Circle key={p.date} cx={x(i)} cy={y(p.value)} r={2.5} fill={colors.accent} />
          ))}
          <Circle cx={x(points.length - 1)} cy={y(last.value)} r={5} fill={highlight} stroke={colors.surface} strokeWidth={2} />
          <SvgText
            x={x(points.length - 1)}
            y={y(last.value) - 10}
            fill={colors.text}
            fontSize={11}
            fontFamily={fonts.extrabold}
            textAnchor={points.length === 1 ? 'middle' : 'end'}
          >
            {`${formatDecimal(last.value)}${isPr ? ' · PR' : ''}`}
          </SvgText>
          <SvgText x={x(0)} y={height - 4} fill={colors.textMuted} fontSize={10} fontFamily={fonts.medium} textAnchor={points.length === 1 ? 'middle' : 'start'}>
            {shortDate(points[0].date)}
          </SvgText>
          {points.length > 2 ? (
            <SvgText x={x(mid)} y={height - 4} fill={colors.textMuted} fontSize={10} fontFamily={fonts.medium} textAnchor="middle">
              {shortDate(points[mid].date)}
            </SvgText>
          ) : null}
          {points.length > 1 ? (
            <SvgText x={x(points.length - 1)} y={height - 4} fill={colors.textMuted} fontSize={10} fontFamily={fonts.medium} textAnchor="end">
              {shortDate(last.date)}
            </SvgText>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

// Barras de volume por treino; a última em destaque.
export function BarChart({ points, height = 110, label }: { points: ChartPoint[]; height?: number; label: string }) {
  const { width, onLayout } = useWidth();
  const max = Math.max(1, ...points.map((p) => p.value));
  const bottom = height - 18;
  const gap = 6;
  const barW = points.length ? Math.min(28, (width - gap * (points.length - 1)) / points.length) : 0;
  const total = barW * points.length + gap * (points.length - 1);
  const start = (width - total) / 2;
  return (
    <View onLayout={onLayout} style={{ height }} accessibilityRole="image" accessibilityLabel={label}>
      {width > 0 && points.length > 0 ? (
        <Svg width={width} height={height}>
          <Line x1={0} y1={bottom} x2={width} y2={bottom} stroke={colors.borderInput} strokeWidth={1} />
          {points.map((p, i) => {
            const h = Math.max(3, (p.value / max) * (bottom - 16));
            const isLast = i === points.length - 1;
            return (
              <Rect
                key={p.date}
                x={start + i * (barW + gap)}
                y={bottom - h}
                width={barW}
                height={h}
                rx={Math.min(6, barW / 2)}
                fill={isLast ? colors.accent : colors.borderDashed}
              />
            );
          })}
          <SvgText x={start + barW / 2} y={height - 4} fill={colors.textMuted} fontSize={10} fontFamily={fonts.medium} textAnchor={points.length === 1 ? 'middle' : 'start'}>
            {shortDate(points[0].date)}
          </SvgText>
          {points.length > 1 ? (
            <SvgText x={start + total} y={height - 4} fill={colors.textMuted} fontSize={10} fontFamily={fonts.medium} textAnchor="end">
              {shortDate(points[points.length - 1].date)}
            </SvgText>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
