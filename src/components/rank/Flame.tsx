import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

// Chama em camadas do AnimStreak (viewBox 100×120). Cada camada é uma Svg própria dentro de uma
// Animated.View para tremular de forma independente com o driver nativo.
const K = 2.1; // px por unidade do viewBox
const W = 100 * K;
const H = 120 * K;

const OUTER = ['#E8261A', '#FF6A14', '#FFA530'];
const MID = ['#FF7A18', '#FFC24D'];
const INNER = ['#FFD873', '#FFFDF2'];

function Layer({ d, stops, id }: { d: string; stops: string[]; id: string }) {
  return (
    <Svg width={W} height={H} viewBox="0 0 100 120" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          {stops.map((c, i) => (
            <Stop key={c} offset={stops.length === 3 ? [0, 0.55, 1][i] : i} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Path d={d} fill={`url(#${id})`} />
    </Svg>
  );
}

type Keys = { t: number[]; sx: number[]; sy: number[]; skew?: string[]; ty?: number[]; op?: number[] };

const FA: Keys = { t: [0, 0.3, 0.6, 0.8, 1], sx: [1, 1.03, 0.98, 1.01, 1], sy: [1, 1.07, 0.96, 1.03, 1], skew: ['0deg', '-2.5deg', '2deg', '-1deg', '0deg'] };
const FB: Keys = { t: [0, 0.4, 0.7, 1], sx: [1, 0.96, 1.03, 1], sy: [1, 1.08, 0.95, 1], skew: ['0deg', '3deg', '-2deg', '0deg'] };
const FC: Keys = { t: [0, 0.5, 1], sx: [1, 0.92, 1], sy: [1, 1.12, 1], ty: [0, -3 * K, 0] };
const FT: Keys = { t: [0, 0.5, 1], sx: [1, 0.7, 1], sy: [1, 1.28, 1], op: [0.9, 0.4, 0.9] };

function Flicker({ value, keys, origin, children }: { value: Animated.Value; keys: Keys; origin: [number, number]; children: ReactNode }) {
  const i = (out: number[]) => value.interpolate({ inputRange: keys.t, outputRange: out });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: W,
        height: H,
        opacity: keys.op ? i(keys.op) : 1,
        transformOrigin: [origin[0] * K, origin[1] * K, 0],
        transform: [
          ...(keys.ty ? [{ translateY: i(keys.ty) }] : []),
          { scaleX: i(keys.sx) },
          { scaleY: i(keys.sy) },
          ...(keys.skew ? [{ skewX: value.interpolate({ inputRange: keys.t, outputRange: keys.skew }) }] : []),
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

const EMBERS = [
  { cx: 42, cy: 44, r: 2.4, dx: -22, delay: 0, color: '#FFC24D' },
  { cx: 58, cy: 40, r: 2, dx: 18, delay: 500, color: '#FF8A1F' },
  { cx: 50, cy: 30, r: 1.6, dx: -8, delay: 1000, color: '#FFE08A' },
  { cx: 62, cy: 52, r: 1.8, dx: 26, delay: 1500, color: '#FFC24D' },
  { cx: 36, cy: 56, r: 1.6, dx: -28, delay: 2000, color: '#FF8A1F' },
  { cx: 50, cy: 36, r: 2.2, dx: 6, delay: 2400, color: '#FFE08A' },
];

function loop(v: Animated.Value, duration: number, delay = 0, easing = Easing.linear) {
  return Animated.sequence([
    Animated.delay(delay),
    Animated.loop(Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: true })),
  ]);
}

// animate=false: chama parada (movimento reduzido ou sequência apagada).
export function Flame({ animate, dim }: { animate: boolean; dim?: boolean }) {
  const fa = useRef(new Animated.Value(0)).current;
  const fb = useRef(new Animated.Value(0)).current;
  const fc = useRef(new Animated.Value(0)).current;
  const f4 = useRef(new Animated.Value(0)).current;
  const f5 = useRef(new Animated.Value(0)).current;
  const f6 = useRef(new Animated.Value(0)).current;
  const heat = useRef([new Animated.Value(0), new Animated.Value(0)]).current;
  const embers = useRef(EMBERS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!animate) return;
    const all = Animated.parallel([
      loop(fa, 1900),
      loop(fb, 1350),
      loop(fc, 1050),
      loop(f4, 1500),
      loop(f5, 1750, 450),
      loop(f6, 1200, 200),
      loop(heat[0], 2600, 0, Easing.out(Easing.quad)),
      loop(heat[1], 2600, 1300, Easing.out(Easing.quad)),
      ...embers.map((e, i) => loop(e, 2800, EMBERS[i].delay, Easing.bezier(0.3, 0.6, 0.5, 1))),
    ]);
    all.start();
    return () => all.stop();
  }, [animate, fa, fb, fc, f4, f5, f6, heat, embers]);

  return (
    <View style={{ width: W, height: H, opacity: dim ? 0.45 : 1 }}>
      <Svg width={W} height={H} viewBox="0 0 100 120" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="ab" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FF8A2A" stopOpacity={0.7} />
            <Stop offset="1" stopColor="#FF8A2A" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={50} cy={112} rx={40} ry={8} fill="url(#ab)" />
      </Svg>

      {animate
        ? heat.map((h, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={[
                styles.heat,
                {
                  opacity: h.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                  transform: [{ scale: h.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }],
                },
              ]}
            />
          ))
        : null}

      <Flicker value={f4} keys={FT} origin={[26.5, 80]}>
        <Layer id="f4" stops={OUTER} d="M28 80 C16 68 18 50 25 40 C28 54 34 60 37 72 Z" />
      </Flicker>
      <Flicker value={f5} keys={FT} origin={[73.5, 80]}>
        <Layer id="f5" stops={OUTER} d="M72 80 C84 68 82 50 75 40 C72 54 66 60 63 72 Z" />
      </Flicker>
      <Flicker value={fa} keys={FA} origin={[50, 112]}>
        <Layer id="f1" stops={OUTER} d="M50 4 C58 22 80 36 82 64 C84 92 68 112 50 112 C32 112 16 92 18 64 C20 46 32 38 36 22 C40 34 42 40 44 46 C46 30 50 20 50 4 Z" />
      </Flicker>
      <Flicker value={f6} keys={FT} origin={[61, 40]}>
        <Layer id="f6" stops={MID} d="M62 40 C66 32 66 24 62 16 C60 24 56 28 56 34 Z" />
      </Flicker>
      <Flicker value={fb} keys={FB} origin={[50, 109]}>
        <Layer id="f2" stops={MID} d="M50 32 C57 47 73 58 73 79 C73 99 62 109 50 109 C38 109 27 99 27 80 C27 68 35 62 38 51 C42 60 44 64 45 70 C48 57 50 47 50 32 Z" />
      </Flicker>
      <Flicker value={fc} keys={FC} origin={[50, 107]}>
        <Layer id="f3" stops={INNER} d="M50 60 C55 71 63 78 63 91 C63 102 57 107 50 107 C43 107 37 102 37 92 C37 84 42 80 45 73 C47 79 48 82 49 86 C50 77 51 69 50 60 Z" />
      </Flicker>

      {animate
        ? EMBERS.map((e, i) => {
            const size = e.r * 2 * K;
            const v = embers[i];
            return (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: e.cx * K - size / 2,
                  top: e.cy * K - size / 2,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: e.color,
                  opacity: v.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 0] }),
                  transform: [
                    { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, e.dx * K] }) },
                    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -120 * K] }) },
                    { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.15] }) },
                  ],
                }}
              />
            );
          })
        : null}
    </View>
  );
}

export const FLAME_SIZE = { width: W, height: H };

const styles = StyleSheet.create({
  heat: {
    position: 'absolute',
    left: (50 - 40) * K,
    top: (70 - 40) * K,
    width: 80 * K,
    height: 80 * K,
    borderRadius: 40 * K,
    borderWidth: 1.7,
    borderColor: '#FF8A2A',
  },
});
