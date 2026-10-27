import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { strengthApi } from '@/api/endpoints';
import type { WeeklyLeaderboardEntry } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { Burst, CelebrationLayout, useReduceMotion, type Particle } from '@/components/rank/motion';
import { shortName } from '@/components/rank/names';
import { EmptyState, ErrorBanner, LoadingView } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { formatNumber } from '@/utils/format';

const ROW = 56;
const GAP = 8;
const STEP = ROW + GAP;

const CONFETTI: Particle[] = [
  { x: -120, y: -80, color: colors.accent, size: 8, w: 8, h: 12, spin: true },
  { x: 130, y: -90, color: colors.protein, size: 8, w: 8, h: 12, spin: true },
  { x: -90, y: 60, color: colors.fat, size: 8, w: 8, h: 12, spin: true },
  { x: 110, y: 70, color: colors.carbs, size: 8, w: 8, h: 12, spin: true },
  { x: 10, y: -130, color: colors.accent, size: 8, w: 8, h: 12, spin: true },
];

function toInt(v: string | undefined) {
  const n = v ? Number(v) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default function RankingCelebrationScreen() {
  const params = useLocalSearchParams<{ from?: string; to?: string }>();
  const userId = useUserId();
  const { data, error, loading, reload } = useApi(() => strengthApi.weekly(100), []);

  const me = data?.find((e) => e.userId === userId) ?? null;
  const toPos = toInt(params.to) ?? me?.position ?? null;
  const fromRaw = toInt(params.from);
  const fromPos = fromRaw && toPos && fromRaw > toPos ? fromRaw : null;

  return (
    <CelebrationLayout background={colors.bg} buttonTitle="Ver ranking completo" onPress={() => router.replace('/ranking/semanal')}>
      {error && !data ? (
        <View style={{ alignSelf: 'stretch', marginTop: 40 }}>
          <ErrorBanner message={error.message} onRetry={reload} />
        </View>
      ) : null}
      {loading && !data ? <LoadingView /> : null}
      {data && toPos ? <Content entries={data} me={me} toPos={toPos} fromPos={fromPos} userId={userId} /> : null}
      {data && !toPos ? (
        <View style={{ alignSelf: 'stretch', marginTop: 40 }}>
          <EmptyState
            icon="podium"
            title="Você ainda não está no ranking"
            message="Registre séries com carga nesta semana para entrar no ranking de volume. O ranking fecha domingo."
          />
        </View>
      ) : null}
    </CelebrationLayout>
  );
}

function Content({
  entries,
  me,
  toPos,
  fromPos,
  userId,
}: {
  entries: WeeklyLeaderboardEntry[];
  me: WeeklyLeaderboardEntry | null;
  toPos: number;
  fromPos: number | null;
  userId: number;
}) {
  const reduce = useReduceMotion();
  const others = entries.filter((e) => e.userId !== userId);
  const above = others.filter((e) => e.position >= toPos - 2 && e.position < toPos).slice(-2);
  const below = others.filter((e) => e.position > toPos).slice(0, 2);
  const climbed = fromPos ? fromPos - toPos : 0;
  const shift = Math.min(climbed, below.length);
  const ahead = others.find((e) => e.position === toPos - 1) ?? null;
  const missing = me && ahead ? Math.max(1, Math.ceil(ahead.volumeKg - me.volumeKg)) : null;
  const progress = me && ahead && ahead.volumeKg > 0 ? Math.min(100, (me.volumeKg / ahead.volumeKg) * 100) : 100;

  const move = useRef(new Animated.Value(0)).current;
  const bump = useRef(new Animated.Value(0)).current;
  const swap = useRef(new Animated.Value(0)).current;
  const chip = useRef(new Animated.Value(0)).current;
  const confetti = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current; // JS (largura)

  useEffect(() => {
    if (reduce === null) return;
    if (reduce || !fromPos) {
      [move, swap, chip].forEach((v) => v.setValue(1));
      if (reduce) {
        bar.setValue(1);
        return;
      }
      const fill = Animated.timing(bar, { toValue: 1, duration: 900, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false });
      fill.start();
      return () => fill.stop();
    }
    const anim = Animated.sequence([
      Animated.delay(500),
      Animated.timing(bump, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(move, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.sequence([Animated.delay(300), Animated.timing(swap, { toValue: 1, duration: 300, useNativeDriver: true })]),
        Animated.timing(bar, { toValue: 1, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(bump, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.spring(chip, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
        Animated.timing(confetti, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [reduce, fromPos, move, bump, swap, chip, confetti, bar]);

  const meY = move.interpolate({ inputRange: [0, 1], outputRange: [shift * STEP, 0] });
  const belowY = move.interpolate({ inputRange: [0, 1], outputRange: [-STEP, 0] });

  return (
    <>
      <View style={{ alignItems: 'center', gap: 8 }} accessibilityRole="alert">
        <Text style={styles.overline}>RANKING SEMANAL · VOLUME</Text>
        <Text style={styles.title}>{fromPos ? 'Você subiu!' : 'Sua posição na semana'}</Text>
        <View style={styles.positions}>
          {fromPos ? (
            <>
              <Text style={styles.oldPos}>{fromPos}º</Text>
              <Icon name="chevronRight" size={28} color={colors.protein} strokeWidth={2.4} />
            </>
          ) : null}
          <Text style={styles.newPos}>{toPos}º</Text>
        </View>
      </View>

      <View style={styles.list}>
        {above.map((e) => (
          <PlainRow key={e.userId} entry={e} />
        ))}

        <Animated.View
          style={[
            styles.row,
            styles.meRow,
            {
              transform: [
                { translateY: meY },
                { scale: bump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
              ],
            },
          ]}
        >
          <View style={{ width: 24, height: 20 }}>
            {fromPos ? (
              <Animated.Text style={[styles.pos, styles.absPos, { color: colors.accent, opacity: swap.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
                {fromPos}
              </Animated.Text>
            ) : null}
            <Animated.Text style={[styles.pos, styles.absPos, { color: colors.accent, opacity: swap }]}>{toPos}</Animated.Text>
          </View>
          <Text style={[styles.name, { fontFamily: fonts.extrabold }]}>Você</Text>
          {climbed > 0 ? (
            <Animated.View style={[styles.chip, { opacity: chip.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }), transform: [{ scale: chip.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>
              <Text style={styles.chipText}>▲ {climbed}</Text>
            </Animated.View>
          ) : null}
          <Text style={styles.volume}>{me ? `${formatNumber(me.volumeKg)} kg` : ''}</Text>
          <Burst progress={confetti} particles={CONFETTI} left={170} top={ROW / 2} />
        </Animated.View>

        {below.map((e, j) => (
          <Animated.View key={e.userId} style={j < shift ? { transform: [{ translateY: belowY }] } : null}>
            <PlainRow entry={e} />
          </Animated.View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.between}>
          <Text style={styles.cardTitle}>{ahead ? `Até o ${toPos - 1}º lugar` : 'Você lidera a semana!'}</Text>
          {missing != null ? <Text style={styles.cardMeta}>faltam {formatNumber(missing)} kg</Text> : null}
        </View>
        <View style={styles.track}>
          <Animated.View
            style={[styles.fill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${progress}%`] }) }]}
          />
        </View>
        <Text style={styles.cardMeta}>
          {me ? `${me.workouts} treino${me.workouts === 1 ? '' : 's'} nesta semana · ` : ''}o ranking fecha domingo
        </Text>
      </View>
    </>
  );
}

function PlainRow({ entry }: { entry: WeeklyLeaderboardEntry }) {
  return (
    <View style={styles.row}>
      <Text style={styles.pos}>{entry.position}</Text>
      <Text style={styles.name} numberOfLines={1}>{shortName(entry.name)}</Text>
      <Text style={styles.volume}>{formatNumber(entry.volumeKg)} kg</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overline: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1.7, color: colors.protein },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.text, textAlign: 'center' },
  positions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  oldPos: { fontFamily: fonts.display, fontSize: 40, color: colors.textDone, textDecorationLine: 'line-through' },
  newPos: { fontFamily: fonts.display, fontSize: 40, color: colors.accent },
  list: { alignSelf: 'stretch', gap: GAP, marginTop: 8 },
  row: {
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meRow: {
    zIndex: 2,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  pos: { width: 24, fontFamily: fonts.extrabold, fontSize: 15, color: colors.textMuted },
  absPos: { position: 'absolute', left: 0, top: 0 },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  volume: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: colors.accent },
  chipText: { fontFamily: fonts.extrabold, fontSize: 11, color: colors.onAccent },
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
  cardMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  track: { height: 8, borderRadius: 99, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 99, backgroundColor: colors.protein },
});
