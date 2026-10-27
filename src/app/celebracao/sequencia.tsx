import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { strengthApi, workoutApi } from '@/api/endpoints';
import type { Streak } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Flame } from '@/components/rank/Flame';
import { CelebrationLayout, Glow, useReduceMotion } from '@/components/rank/motion';
import { ErrorBanner, LoadingView } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { addDays, parseIsoDate, today, weekdayShort } from '@/utils/format';

// Paleta de fogo do mockup (cores pontuais desta tela).
const FIRE = {
  bg: '#0B0806',
  halo: '#FF5A12',
  glow: '#FF6A1A',
  dot: '#FF8A3D',
  number: '#FFB25B',
  unit: '#FFD9AE',
  soft: '#C9B39A',
  card: '#1A130C',
  cardBorder: '#3A2814',
  dashed: '#6A4520',
};

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
  const roll = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const up = useRef(new Animated.Value(0)).current;
  const cards = useRef(new Animated.Value(0)).current;
  const dots = useRef(days.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduce === null) return;
    if (reduce) {
      [ignite, roll, up, cards, halo, ...dots].forEach((v) => v.setValue(1));
      return;
    }
    const ease = Easing.bezier(0.22, 1, 0.36, 1);
    let k = 0;
    const main = Animated.parallel([
      Animated.timing(ignite, { toValue: 1, duration: 1400, easing: Easing.bezier(0.22, 1.4, 0.36, 1), useNativeDriver: true }),
      Animated.timing(roll, { toValue: 1, delay: 900, duration: 1200, easing: ease, useNativeDriver: true }),
      Animated.timing(up, { toValue: 1, delay: 1200, duration: 800, easing: ease, useNativeDriver: true }),
      ...dots.map((d, i) =>
        trained.has(days[i])
          ? Animated.timing(d, { toValue: 1, delay: 1400 + 150 * k++, duration: 600, easing: Easing.bezier(0.22, 1.5, 0.36, 1), useNativeDriver: true })
          : Animated.timing(d, { toValue: 1, duration: 0, useNativeDriver: true }),
      ),
      Animated.timing(cards, { toValue: 1, delay: 2000, duration: 800, easing: ease, useNativeDriver: true }),
    ]);
    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    main.start();
    if (lit) haloLoop.start();
    return () => {
      main.stop();
      haloLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, lit]);

  const next = MILESTONES.find((m) => m > current) ?? current + 100;
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= current) ?? 0;
  const expires = streak.expiresOn ? parseIsoDate(streak.expiresOn) : null;
  const expiresLabel = streak.expiresOn && expires ? `${(WEEKDAY_LABEL[weekdayShort(streak.expiresOn)] ?? weekdayShort(streak.expiresOn)).toLowerCase()}, ${expires.getDate()}` : '–';
  const fadeUp = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  });

  return (
    <>
      <Glow
        color={FIRE.halo}
        size={320}
        style={{
          top: 30,
          alignSelf: 'center',
          transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) }],
        }}
        opacity={lit ? halo.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) : 0.3}
      />

      <Animated.View
        style={{
          opacity: ignite.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [
            { translateY: ignite.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
            { scale: ignite.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) },
          ],
        }}
      >
        <Flame animate={reduce === false && lit} dim={!lit} />
      </Animated.View>

      <View style={styles.numberRow} accessibilityLabel={`${current} dias de sequência`}>
        <View style={{ height: NUM_H, overflow: 'hidden' }}>
          <Animated.View style={{ transform: [{ translateY: roll.interpolate({ inputRange: [0, 1], outputRange: [0, -NUM_H] }) }] }}>
            <Text style={styles.number}>{Math.max(0, current - 1)}</Text>
            <Text style={styles.number}>{current}</Text>
          </Animated.View>
        </View>
        <Text style={styles.unit}>{current === 1 ? 'dia' : 'dias'}</Text>
      </View>

      <Animated.View style={[{ gap: 8, alignItems: 'center' }, fadeUp(up)]} accessibilityRole="alert">
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
                    { opacity: dots[i], transform: [{ scale: dots[i].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] },
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

      <Animated.View style={[styles.cards, fadeUp(cards)]}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{streak.longestStreakDays} {streak.longestStreakDays === 1 ? 'dia' : 'dias'}</Text>
          <Text style={styles.cardLabel}>seu recorde</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{lit ? expiresLabel : 'hoje'}</Text>
          <Text style={styles.cardLabel}>{lit ? 'treine até para manter' : 'treine para acender'}</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.milestone, fadeUp(cards)]}>
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
  dotToday: { shadowColor: FIRE.glow, shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
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
