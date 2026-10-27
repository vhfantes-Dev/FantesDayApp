import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

// Paleta "água" dos mockups (Agua.dc.html / Main.dc.html).
export const WATER = {
  card: '#0F1520',
  cardBorder: '#1E2C42',
  cardActive: '#12233A',
  accent: '#2F7BD9',
  light: '#5DB0FF',
  top: '#6BC0FF',
  deep: '#1E5FB8',
  glass: '#4E78A8',
  inside: '#0D1624',
  muted: '#8FA8C8',
  text: '#DCEEFF',
  dashed: '#2A3A52',
} as const;

// viewBox 200×260; interior do copo vai de y=12 (borda) a y=250 (fundo).
const GLASS = 'M20 12 H180 L162 238 Q160 250 148 250 H52 Q40 250 38 238 Z';
const TOP = 12;
const BOTTOM = 250;

let seq = 0;

function wavePath(width: number, height: number, amp: number, lambda: number) {
  let d = `M0 ${amp}`;
  d += ` Q${lambda / 4} 0 ${lambda / 2} ${amp}`;
  for (let x = lambda; x <= width + lambda; x += lambda / 2) d += ` T${x} ${amp}`;
  return `${d} V${height} H0 Z`;
}

/**
 * Copo com água que sobe até `percent` e ondas que correm na superfície.
 * `background` é a cor atrás do copo (pinta o lado de fora para recortar a água).
 */
export function WaterGlass({
  width,
  percent,
  background,
  animate,
  strokeWidth = 3,
}: {
  width: number;
  percent: number;
  background: string;
  animate: boolean;
  strokeWidth?: number;
}) {
  const s = width / 200;
  const height = 260 * s;
  const level = Math.max(0, Math.min(100, percent)) / 100;
  const surface = (BOTTOM - level * (BOTTOM - TOP)) * s;

  const lambda = 50 * s;
  const amp = Math.max(1.5, 6 * s);
  const stripWidth = width + lambda * 3;

  const id = useRef(`wg${++seq}`).current;
  const rise = useRef(new Animated.Value(height)).current;
  const w1 = useRef(new Animated.Value(0)).current;
  const w2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      rise.setValue(surface);
      return;
    }
    const a = Animated.timing(rise, { toValue: surface, duration: 1400, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [surface, animate, rise]);

  useEffect(() => {
    if (!animate) {
      w1.setValue(0);
      w2.setValue(0);
      return;
    }
    const loops = Animated.parallel([
      Animated.loop(Animated.timing(w1, { toValue: 1, duration: 3400, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.timing(w2, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true })),
    ]);
    loops.start();
    return () => loops.stop();
  }, [animate, w1, w2]);

  const path = wavePath(stripWidth, height + amp * 2, amp, lambda);

  return (
    <View style={{ width, height, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: WATER.inside }]} />

      {level > 0 ? (
        <Animated.View style={[styles.layer, { width, height: height + amp * 2, transform: [{ translateY: rise }] }]}>
          <Animated.View
            style={[
              styles.layer,
              {
                top: 5 * s,
                transform: [{ translateX: w2.interpolate({ inputRange: [0, 1], outputRange: [-lambda * 2, 0] }) }],
              },
            ]}
          >
            <Svg width={stripWidth} height={height + amp * 2}>
              <Path d={path} fill={WATER.accent} opacity={0.55} />
            </Svg>
          </Animated.View>
          <Animated.View
            style={[
              styles.layer,
              { transform: [{ translateX: w1.interpolate({ inputRange: [0, 1], outputRange: [0, -lambda * 2] }) }] },
            ]}
          >
            <Svg width={stripWidth} height={height + amp * 2}>
              <Defs>
                <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={WATER.top} />
                  <Stop offset="1" stopColor={WATER.deep} />
                </LinearGradient>
              </Defs>
              <Path d={path} fill={`url(#${id})`} opacity={0.9} />
            </Svg>
          </Animated.View>
        </Animated.View>
      ) : null}

      <Svg width={width} height={height} viewBox="0 0 200 260" style={StyleSheet.absoluteFill}>
        <Path d={`M-2 -2 H202 V262 H-2 Z ${GLASS}`} fill={background} fillRule="evenodd" />
        <Path d={GLASS} fill="none" stroke={WATER.glass} strokeWidth={strokeWidth / s > 3 ? strokeWidth / s : 3} strokeLinejoin="round" />
        <Path d="M34 26 L48 226" stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={6} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0 },
});
