import { useState } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';

import type { WeightEntry } from '@/api/types';
import { colors } from '@/theme';
import { formatDecimal, shortDate } from '@/utils/format';
import { useLoop, useOnce } from './motion';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Medidor semicircular do IMC (15 a 40). Faixas: <18,5 · 18,5–25 · 25–30 · ≥30.
export function BmiGauge({ bmi, label }: { bmi: number; label: string }) {
  const target = Math.max(-90, Math.min(90, ((bmi - 15) / 25) * 180 - 90));
  const t = useOnce(1600, { delay: 300 });
  const arcs = useOnce(1000, { native: false });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', `${target}deg`] });
  const dash = arcs.interpolate({ inputRange: [0, 1], outputRange: [130, 0] });
  const W = 220;
  const H = 123;
  const k = W / 200; // escala do viewBox
  const segments = [
    { d: 'M20 100 A80 80 0 0 1 27.6 65.9', color: colors.protein },
    { d: 'M28.6 63.9 A80 80 0 0 1 74.3 24.3', color: colors.accent },
    { d: 'M77.3 23.4 A80 80 0 0 1 122.7 23.4', color: colors.carbs },
    { d: 'M125.7 24.3 A80 80 0 0 1 180 100', color: '#FF6B5A' },
  ];
  return (
    <View style={{ width: W, height: H }} accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={W} height={H} viewBox="0 0 200 112">
        {segments.map((s) => (
          <AnimatedPath key={s.d} d={s.d} fill="none" stroke={s.color} strokeWidth={14} strokeDasharray="130" strokeDashoffset={dash} />
        ))}
      </Svg>
      <Animated.View
        style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: [100 * k, 100 * k, 0], transform: [{ rotate }] }}
      >
        <Svg width={W} height={H} viewBox="0 0 200 112">
          <Path d="M97 100 L100 34 L103 100 Z" fill={colors.text} />
        </Svg>
      </Animated.View>
      <Svg width={W} height={H} viewBox="0 0 200 112" style={{ position: 'absolute' }}>
        <Circle cx={100} cy={100} r={8} fill={colors.text} stroke={colors.surface} strokeWidth={3} />
      </Svg>
    </View>
  );
}

// Linha do peso ao longo do tempo, com área suave e o último ponto pulsando.
export function WeightChart({ entries, height = 172 }: { entries: WeightEntry[]; height?: number }) {
  const [width, setWidth] = useState(0);
  const draw = useOnce(2000, { delay: 200, native: false, trigger: entries.length + (entries[entries.length - 1]?.weightKg ?? 0) });
  const pulse = useLoop(2000, { rest: 1 });

  const left = 34;
  const right = width - 6;
  const top = 10;
  const bottom = height - 32;
  const values = entries.map((e) => e.weightKg);
  let min = Math.floor(Math.min(...values));
  let max = Math.ceil(Math.max(...values));
  if (max - min < 2) {
    min -= 1;
    max += 1;
  }
  const stepKg = Math.max(1, Math.ceil((max - min) / 4));
  const ticks: number[] = [];
  for (let v = max; v >= min; v -= stepKg) ticks.push(v);
  const y = (v: number) => top + ((max - v) / (max - min)) * (bottom - top);
  const t0 = entries.length ? Date.parse(entries[0].date) : 0;
  const t1 = entries.length ? Date.parse(entries[entries.length - 1].date) : 1;
  const x = (date: string) => (t1 === t0 ? (left + right) / 2 : left + ((Date.parse(date) - t0) / (t1 - t0)) * (right - left));
  const pts = entries.map((e) => [x(e.date), y(e.weightKg)] as const);
  const points = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  let length = 0;
  for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const area = pts.length > 1 ? `M${points.split(' ').join(' L')} L${pts[pts.length - 1][0]} ${bottom} L${pts[0][0]} ${bottom} Z` : '';
  const last = pts[pts.length - 1];
  const mid = entries[Math.floor((entries.length - 1) / 2)];

  const first = entries[0];
  const final = entries[entries.length - 1];
  const label = first && final
    ? `Peso de ${formatDecimal(first.weightKg)} kg em ${shortDate(first.date)} para ${formatDecimal(final.weightKg)} kg em ${shortDate(final.date)}`
    : 'Sem registros';

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessible accessibilityRole="image" accessibilityLabel={label}>
      {width > 0 && entries.length > 0 ? (
        <>
          <Svg width={width} height={height}>
            {ticks.map((v) => (
              <G key={v}>
                <Line x1={30} y1={y(v)} x2={width} y2={y(v)} stroke={colors.divider} />
                <SvgText x={0} y={y(v) + 4} fill={colors.textMuted} fontSize={10}>{String(v)}</SvgText>
              </G>
            ))}
            {area ? <Path d={area} fill={colors.accent} opacity={0.08} /> : null}
            {pts.length > 1 ? (
              <AnimatedPolyline
                points={points}
                fill="none"
                stroke={colors.accent}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={`${length + 1}`}
                strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [length + 1, 0] })}
              />
            ) : null}
            <Circle cx={last[0]} cy={last[1]} r={5} fill={colors.accent} stroke={colors.surface} strokeWidth={2} />
            <SvgText x={pts[0][0]} y={height - 6} fill={colors.textMuted} fontSize={10}>{shortDate(entries[0].date)}</SvgText>
            {entries.length > 2 ? (
              <SvgText x={x(mid.date)} y={height - 6} fill={colors.textMuted} fontSize={10} textAnchor="middle">{shortDate(mid.date)}</SvgText>
            ) : null}
            {entries.length > 1 ? (
              <SvgText x={last[0]} y={height - 6} fill={colors.textMuted} fontSize={10} textAnchor="end">{shortDate(final.date)}</SvgText>
            ) : null}
          </Svg>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: last[0] - 5,
              top: last[1] - 5,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.accent,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] }) }],
            }}
          />
        </>
      ) : null}
    </View>
  );
}
