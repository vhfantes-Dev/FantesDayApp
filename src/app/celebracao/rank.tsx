import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import type { StrengthRank } from '@/api/types';
import { CelebrationLayout, Glow, useReduceMotion } from '@/components/rank/motion';
import { RankBadge } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { RANK_ORDER, rankProgress, RANKS } from '@/utils/ranks';

const STAGE = 300;
const FLASH = '#FFF4D6';

function asRank(v: string | undefined): StrengthRank | null {
  return v && (RANK_ORDER as string[]).includes(v) ? (v as StrengthRank) : null;
}

export default function RankUpScreen() {
  const params = useLocalSearchParams<{ exerciseName?: string; from?: string; to?: string; score?: string }>();
  const to = asRank(params.to) ?? 'BRONZE';
  const from = asRank(params.from);
  const score = params.score ? Number(params.score) : null;
  const info = RANKS[to];
  const lp = score != null && Number.isFinite(score) ? Math.max(0, score - info.min) : 0;
  const target = Math.max(4, rankProgress(to, lp));
  const reduce = useReduceMotion();

  const lpBar = useRef(new Animated.Value(from ? 78 : 0)).current; // JS (largura)
  const oldOut = useRef(new Animated.Value(from ? 0 : 1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const newIn = useRef(new Animated.Value(0)).current;
  const raysIn = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce === null) return;
    if (reduce) {
      lpBar.setValue(target);
      [oldOut, newIn, raysIn, text].forEach((v) => v.setValue(1));
      return;
    }
    const intro = from
      ? [
          Animated.delay(300),
          Animated.timing(lpBar, { toValue: 100, duration: 900, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }),
          Animated.parallel([
            Animated.timing(oldOut, { toValue: 1, duration: 550, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            Animated.sequence([
              Animated.delay(250),
              Animated.timing(flash, { toValue: 1, duration: 700, useNativeDriver: true }),
            ]),
          ]),
        ]
      : [Animated.delay(300)];
    const anim = Animated.sequence([
      ...intro,
      Animated.parallel([
        Animated.spring(newIn, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
        Animated.timing(raysIn, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(lpBar, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.sequence([
          Animated.delay(350),
          Animated.parallel([
            Animated.timing(text, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(lpBar, { toValue: target, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
            Animated.timing(shine, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ]),
        ]),
      ]),
    ]);
    const rotate = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true }));
    anim.start();
    rotate.start();
    return () => {
      anim.stop();
      rotate.stop();
    };
  }, [reduce, from, target, lpBar, oldOut, flash, newIn, raysIn, spin, shine, text]);

  const fromInfo = from ? RANKS[from] : null;
  const scoreText = score != null && Number.isFinite(score) ? ` · nota ${score} de 1000` : '';

  return (
    <CelebrationLayout
      buttonTitle="Continuar"
      buttonColor={info.color}
      onPress={() => router.back()}
      backdrop={
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: FLASH, opacity: flash.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] }) }]}
        />
      }
    >
      <Text style={[styles.overline, { color: info.color }]}>RANK DE FORÇA</Text>

      <View style={styles.stage}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: raysIn,
              transform: [
                { scale: raysIn.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
              ],
            },
          ]}
        >
          <Svg width={STAGE} height={STAGE} viewBox="0 0 300 300">
            <G fill={info.color} opacity={0.16}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Path key={i} d="M150 150 L140 0 L160 0 Z" transform={`rotate(${i * 30} 150 150)`} />
              ))}
            </G>
          </Svg>
        </Animated.View>
        <Glow color={info.color} size={220} />

        {from ? (
          <Animated.View
            style={[
              styles.abs,
              {
                opacity: oldOut.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1, 0] }),
                transform: [{ scale: oldOut.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1.15, 0.2] }) }],
              },
            ]}
          >
            <RankBadge rank={from} size={165} />
          </Animated.View>
        ) : null}

        <Animated.View
          style={[
            styles.abs,
            styles.newSeal,
            {
              opacity: newIn.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
              transform: [
                { scale: newIn },
                { rotate: newIn.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
              ],
            },
          ]}
        >
          <RankBadge rank={to} size={187} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shine,
              {
                opacity: shine.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }),
                transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-80, 230] }) }, { rotate: '20deg' }],
              },
            ]}
          />
        </Animated.View>
      </View>

      <View style={styles.labels}>
        {fromInfo ? (
          <Animated.View style={[styles.labelBox, { opacity: oldOut.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0, 0] }) }]}>
            <Text style={[styles.oldName, { color: fromInfo.color }]}>{fromInfo.label}</Text>
            <Text style={styles.sub}>{params.exerciseName ? `${params.exerciseName} · nova série registrada` : 'Nova série registrada'}</Text>
          </Animated.View>
        ) : null}
        <Animated.View
          accessibilityRole="alert"
          style={[styles.labelBox, { opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}
        >
          <Text style={[styles.title, { color: info.color }]}>Promovido a {info.label}!</Text>
          <Text style={styles.sub}>
            {fromInfo ? `${fromInfo.label} → ${info.label}` : params.exerciseName ?? 'Rank de força'}
            {scoreText}
          </Text>
        </Animated.View>
      </View>

      <View style={{ alignSelf: 'stretch', gap: 8 }}>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              { backgroundColor: info.color, width: lpBar.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>
        <View style={styles.between}>
          <Text style={styles.meta}>{lp} LP no rank</Text>
          <Text style={styles.meta}>{to === 'OLYMPIAN' ? 'Rank máximo' : '100 LP = próximo rank'}</Text>
        </View>
      </View>
    </CelebrationLayout>
  );
}

const styles = StyleSheet.create({
  overline: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1.7, marginTop: 24 },
  stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' },
  abs: { position: 'absolute' },
  newSeal: { width: 187, height: 187, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  shine: { position: 'absolute', top: -20, left: 0, width: 40, height: 230, backgroundColor: 'rgba(255,255,255,0.4)' },
  labels: { alignSelf: 'stretch', height: 76 },
  labelBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 6 },
  oldName: { fontFamily: fonts.display, fontSize: 22 },
  title: { fontFamily: fonts.display, fontSize: 26, textAlign: 'center' },
  sub: { fontFamily: fonts.medium, fontSize: 14, color: colors.textLabel, textAlign: 'center' },
  track: { height: 12, borderRadius: 99, backgroundColor: colors.surface2, overflow: 'hidden' },
  fill: { height: 12, borderRadius: 99 },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontFamily: fonts.bold, fontSize: 12, color: colors.textLabel },
});
