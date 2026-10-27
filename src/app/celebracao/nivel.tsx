import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Burst, CelebrationLayout, Glow, useReduceMotion, type Particle } from '@/components/rank/motion';
import { colors, fonts } from '@/theme';
import { formatNumber } from '@/utils/format';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 220;
const STROKE = 14.6; // 8 no viewBox de 120
const R = (SIZE - STROKE) / 2 - 2;
const C = 2 * Math.PI * R;
const NUM_H = 80;

const PARTICLES: Particle[] = [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
  const rad = (deg * Math.PI) / 180;
  const palette = [colors.accent, colors.protein, colors.accent, colors.fat, colors.accent, colors.carbs, colors.accent, colors.protein];
  return { x: Math.sin(rad) * 150, y: -Math.cos(rad) * 150, color: palette[i], size: i % 2 ? 6 : 8, round: i % 2 === 0 };
});

export default function LevelUpScreen() {
  const params = useLocalSearchParams<{ level?: string; xp?: string }>();
  const level = Math.max(1, Number(params.level) || 1);
  const xp = params.xp != null && params.xp !== '' ? Number(params.xp) : null;
  const xpInLevel = xp != null && Number.isFinite(xp) ? ((xp % 100) + 100) % 100 : 0;
  const reduce = useReduceMotion();

  const ring = useRef(new Animated.Value(0)).current; // JS (prop de SVG)
  const xpBar = useRef(new Animated.Value(0)).current; // JS (largura)
  const flip = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce === null) return;
    if (reduce) {
      [ring, xpBar, flip, pulse, glow, text].forEach((v) => v.setValue(1));
      return;
    }
    const anim = Animated.sequence([
      Animated.delay(250),
      Animated.timing(ring, { toValue: 1, duration: 1500, easing: Easing.bezier(0.5, 0, 0.2, 1), useNativeDriver: false }),
      Animated.parallel([
        Animated.spring(flip, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(burst, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(350),
          Animated.timing(text, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
      Animated.timing(xpBar, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [reduce, ring, xpBar, flip, pulse, burst, glow, text]);

  const fadeUp = {
    opacity: text,
    transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  return (
    <CelebrationLayout
      buttonTitle="Continuar"
      onPress={() => router.back()}
      backdrop={
        <Glow
          color={colors.accent}
          size={340}
          style={{ top: 120, alignSelf: 'center' }}
          opacity={glow.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1, 0.6] })}
        />
      }
    >
      <View accessibilityRole="alert" accessibilityLabel={`Você subiu para o nível ${level}`} style={{ alignItems: 'center', gap: 22, alignSelf: 'stretch' }}>
        <Text style={styles.overline}>NOVO NÍVEL</Text>

        <Animated.View
          style={{
            width: SIZE,
            height: SIZE,
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1.12, 1] }) }],
          }}
        >
          <Burst progress={burst} particles={PARTICLES} left={SIZE / 2} top={SIZE / 2} />
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={colors.divider} strokeWidth={STROKE} />
            <AnimatedCircle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={colors.accent}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${C} ${C}`}
              strokeDashoffset={ring.interpolate({ inputRange: [0, 1], outputRange: [C, 0] })}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          </Svg>
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <View style={{ height: NUM_H, overflow: 'hidden' }}>
              <Animated.View style={{ transform: [{ translateY: flip.interpolate({ inputRange: [0, 1], outputRange: [0, -NUM_H] }) }] }}>
                <Text style={[styles.number, { color: colors.textMuted }]}>{level - 1}</Text>
                <Text style={styles.number}>{level}</Text>
              </Animated.View>
            </View>
            <Text style={styles.levelLabel}>NÍVEL</Text>
          </View>
        </Animated.View>

        <Animated.View style={[{ gap: 10, alignItems: 'center' }, fadeUp]}>
          <Text style={styles.title}>Você subiu de nível!</Text>
          <Text style={styles.body}>
            {xp != null && Number.isFinite(xp) ? `Agora são ${formatNumber(xp)} XP no total.\n` : ''}
            Continue concluindo tarefas e treinos para ganhar mais XP.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.card, fadeUp]}>
          <View style={styles.between}>
            <Text style={styles.cardTitle}>Rumo ao nível {level + 1}</Text>
            <Text style={styles.cardMeta}>{xpInLevel} / 100 XP</Text>
          </View>
          <View style={styles.track}>
            <Animated.View
              style={[
                styles.fill,
                { width: xpBar.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.max(3, xpInLevel)}%`] }) },
              ]}
            />
          </View>
        </Animated.View>
      </View>
    </CelebrationLayout>
  );
}

const styles = StyleSheet.create({
  overline: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1.7, color: colors.accent, marginTop: 40 },
  center: { alignItems: 'center', justifyContent: 'center' },
  number: { height: NUM_H, lineHeight: NUM_H, fontFamily: fonts.display, fontSize: 64, color: colors.text, textAlign: 'center' },
  levelLabel: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1.2, color: colors.textMuted },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.text, textAlign: 'center' },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.textLabel, textAlign: 'center' },
  card: {
    alignSelf: 'stretch',
    gap: 8,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  cardMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  track: { height: 8, borderRadius: 99, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 99, backgroundColor: colors.accent },
});
