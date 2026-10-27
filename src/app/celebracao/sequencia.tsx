import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { strengthApi, workoutApi } from '@/api/endpoints';
import type { Streak } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Burst, CelebrationLayout, Glow, useReduceMotion, type Particle } from '@/components/rank/motion';
import { ErrorBanner, LoadingView } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { addDays, parseIsoDate, today, weekdayShort } from '@/utils/format';

// Paleta de fogo do mockup (cores pontuais desta tela).
const FIRE = {
  bg: '#0B0907',
  halo: '#FF6A1A',
  flame: '#FF6A1A',
  mid: '#FFA24D',
  core: '#FFE3A3',
  dot: '#FF8A3D',
  number: '#FFB25B',
  unit: '#FFD9AE',
  soft: '#C9B39A',
  card: '#1A130C',
  cardBorder: '#3A2814',
  dashed: '#6A4520',
  spark: '#FFD27A',
};

const SPARKS: Particle[] = [
  { x: -70, y: -60, color: FIRE.spark, size: 8, round: true },
  { x: 72, y: -50, color: FIRE.dot, size: 6, round: true },
  { x: -50, y: 60, color: FIRE.number, size: 6, round: true },
  { x: 60, y: 55, color: FIRE.spark, size: 8, round: true },
  { x: 0, y: -90, color: FIRE.dot, size: 6, round: true },
];

const MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365];
const NUM_H = 84;
const WEEKDAY_LABEL: Record<string, string> = { SAB: 'SÁB' };

interface Data {
  streak: Streak;
  trained: Set<string>;
}

export default function StreakScreen() {
  const userId = useUserId();
  const { data, error, loading, reload } = useApi<Data>(async () => {
    const [streak, workouts] = await Promise.all([strengthApi.streak(userId), workoutApi.list(userId).catch(() => [])]);
    const from = addDays(today(), -6);
    return { streak, trained: new Set(workouts.filter((w) => w.date >= from).map((w) => w.date)) };
  }, [userId]);

  return (
    <CelebrationLayout
      background={FIRE.bg}
      buttonTitle="Continuar"
      buttonColor={FIRE.dot}
      onPress={() => router.back()}
    >
      {error && !data ? (
        <View style={{ alignSelf: 'stretch', marginTop: 40 }}>
          <ErrorBanner message={error.message} onRetry={reload} />
        </View>
      ) : null}
      {loading && !data ? <LoadingView /> : null}
      {data ? <Content streak={data.streak} trained={data.trained} /> : null}
    </CelebrationLayout>
  );
}

function Content({ streak, trained }: { streak: Streak; trained: Set<string> }) {
  const reduce = useReduceMotion();
  const current = streak.currentStreakDays;
  const lit = streak.active && current > 0;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));

  const ignite = useRef(new Animated.Value(0)).current;
  const flicker = useRef(new Animated.Value(0)).current;
  const roll = useRef(new Animated.Value(0)).current;
  const sparks = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const up = useRef(new Animated.Value(0)).current;
  const dots = useRef(days.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduce === null) return;
    if (reduce) {
      [ignite, roll, up, halo, ...dots].forEach((v) => v.setValue(1));
      return;
    }
    const main = Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(ignite, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
        Animated.timing(sparks, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(roll, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
        Animated.stagger(
          120,
          dots.map((d) => Animated.spring(d, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true })),
        ),
        Animated.timing(up, { toValue: 1, duration: 500, delay: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]);
    const flick = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 2, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 3, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 4, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    main.start();
    if (lit) {
      flick.start();
      haloLoop.start();
    }
    return () => {
      main.stop();
      flick.stop();
      haloLoop.stop();
    };
  }, [reduce, lit, ignite, flicker, roll, sparks, halo, up, dots]);

  const next = MILESTONES.find((m) => m > current) ?? current + 100;
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= current) ?? 0;
  const expires = streak.expiresOn ? parseIsoDate(streak.expiresOn) : null;
  const expiresLabel = streak.expiresOn && expires ? `${(WEEKDAY_LABEL[weekdayShort(streak.expiresOn)] ?? weekdayShort(streak.expiresOn)).toLowerCase()}, ${expires.getDate()}` : '–';
  const fadeUp = { opacity: up, transform: [{ translateY: up.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] };

  return (
    <>
      <Glow
        color={FIRE.halo}
        size={300}
        style={{ top: 40, alignSelf: 'center' }}
        opacity={lit ? halo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) : 0.3}
      />

      <View style={{ width: 150, height: 168 }}>
        {lit ? <Burst progress={sparks} particles={SPARKS} left={75} top={84} /> : null}
        <Animated.View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            opacity: ignite.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
            transform: [{ scale: ignite.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
          }}
        >
          <Animated.View
            style={{
              flex: 1,
              opacity: lit ? 1 : 0.45,
              transformOrigin: '50% 95%',
              transform: [
                { scaleY: flicker.interpolate({ inputRange: [0, 1, 2, 3, 4], outputRange: [1, 1.06, 0.96, 1.04, 1] }) },
                { skewX: flicker.interpolate({ inputRange: [0, 1, 2, 3, 4], outputRange: ['0deg', '-3deg', '2deg', '-1deg', '0deg'] }) },
              ],
            }}
          >
            <Svg width={150} height={168} viewBox="0 0 24 26">
              <Path d="M12 1c1.8 4.5 7.5 7 7.5 14.5a7.5 7.5 0 0 1-15 0c0-4.3 2.4-6.2 3.1-9.4C9 7.4 9.7 9.3 9.7 11.2 11.8 8.8 12.6 4.6 12 1z" fill={FIRE.flame} />
              <Path d="M12 9c1.3 3 5 4.4 5 8.3a5 5 0 0 1-10 0c0-2.6 1.6-3.7 2.1-5.6 1 1 1.6 2.1 1.6 3.3 1-1.6 1.6-3.6 1.3-6z" fill={FIRE.mid} />
              <Path d="M12 15c.7 1.6 2.6 2.3 2.6 4.4a2.6 2.6 0 0 1-5.2 0c0-1.4.9-1.9 1.1-3 .6.5.9 1.1.9 1.8.5-.9.8-1.9.6-3.2z" fill={FIRE.core} />
            </Svg>
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.numberRow} accessibilityLabel={`${current} dias de sequência`}>
        <View style={{ height: NUM_H, overflow: 'hidden' }}>
          <Animated.View style={{ transform: [{ translateY: roll.interpolate({ inputRange: [0, 1], outputRange: [0, -NUM_H] }) }] }}>
            <Text style={styles.number}>{Math.max(0, current - 1)}</Text>
            <Text style={styles.number}>{current}</Text>
          </Animated.View>
        </View>
        <Text style={styles.unit}>{current === 1 ? 'dia' : 'dias'}</Text>
      </View>

      <Animated.View style={[{ gap: 8, alignItems: 'center' }, fadeUp]} accessibilityRole="alert">
        <Text style={styles.title}>{lit ? 'Sequência em chamas!' : 'Acenda sua sequência'}</Text>
        <Text style={styles.body}>
          {lit
            ? `${streak.workoutsInCurrentStreak} treino${streak.workoutsInCurrentStreak === 1 ? '' : 's'} nesta sequência. `
            : 'Treine hoje para começar uma nova sequência. '}
          Descanso conta, mas 3 dias seguidos sem treinar apagam o fogo.
        </Text>
      </Animated.View>

      <View style={styles.week} accessibilityLabel="Últimos 7 dias">
        {days.map((d, i) => {
          const done = trained.has(d);
          const isToday = i === days.length - 1;
          const label = WEEKDAY_LABEL[weekdayShort(d)] ?? weekdayShort(d);
          return (
            <View key={d} style={styles.dayCol} accessibilityLabel={`${label}: ${done ? 'treinou' : 'sem treino'}`}>
              {done ? (
                <Animated.View
                  style={[
                    styles.dot,
                    isToday && styles.dotToday,
                    { transform: [{ scale: dots[i].interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] },
                  ]}
                />
              ) : (
                <View style={styles.dotEmpty} />
              )}
              <Text style={[styles.dayLabel, isToday && { color: FIRE.number, fontFamily: fonts.extrabold }]}>{label}</Text>
            </View>
          );
        })}
      </View>

      <Animated.View style={[styles.cards, fadeUp]}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{streak.longestStreakDays} {streak.longestStreakDays === 1 ? 'dia' : 'dias'}</Text>
          <Text style={styles.cardLabel}>seu recorde</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{lit ? expiresLabel : 'hoje'}</Text>
          <Text style={styles.cardLabel}>{lit ? 'treine até para manter' : 'treine para acender'}</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.milestone, fadeUp]}>
        <View style={styles.between}>
          <Text style={styles.milestoneTitle}>Próxima marca · {next} dias</Text>
          <Text style={styles.cardLabel}>{current} / {next}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${Math.min(100, (current / next) * 100)}%` }]} />
        </View>
        {prevMilestone > 0 ? <Text style={styles.cardLabel}>Marca de {prevMilestone} dias alcançada</Text> : null}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  numberRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  number: { height: NUM_H, lineHeight: NUM_H, fontFamily: fonts.display, fontSize: 68, color: FIRE.number, textAlign: 'center' },
  unit: { fontFamily: fonts.title, fontSize: 20, color: FIRE.unit, marginBottom: 14 },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text, textAlign: 'center' },
  body: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: FIRE.soft, textAlign: 'center' },
  week: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6, width: 40 },
  dot: { width: 34, height: 34, borderRadius: 17, backgroundColor: FIRE.dot },
  dotToday: { shadowColor: FIRE.halo, shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  dotEmpty: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderStyle: 'dashed', borderColor: FIRE.dashed },
  dayLabel: { fontFamily: fonts.bold, fontSize: 10, color: FIRE.soft },
  cards: { alignSelf: 'stretch', flexDirection: 'row', gap: 10 },
  card: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: FIRE.card, borderWidth: 1, borderColor: FIRE.cardBorder, gap: 2 },
  cardValue: { fontFamily: fonts.title, fontSize: 16, color: colors.text },
  cardLabel: { fontFamily: fonts.regular, fontSize: 11, color: FIRE.soft },
  milestone: { alignSelf: 'stretch', gap: 8, padding: 14, borderRadius: 18, backgroundColor: FIRE.card, borderWidth: 1, borderColor: FIRE.cardBorder },
  milestoneTitle: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: 99, backgroundColor: FIRE.cardBorder, overflow: 'hidden' },
  trackFill: { height: 8, borderRadius: 99, backgroundColor: FIRE.dot },
});
