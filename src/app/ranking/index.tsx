import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { strengthApi } from '@/api/endpoints';
import type { LeaderboardEntry } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { RankingTabs } from '@/components/rank/RankingTabs';
import { useReduceMotion } from '@/components/rank/motion';
import { PLACE_BG, PLACE_BORDER, PLACE_COLORS, shortName } from '@/components/rank/names';
import { Card, EmptyState, ErrorBanner, Header, RankBadge, Screen, SkeletonList } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { initials } from '@/utils/format';
import { RANKS } from '@/utils/ranks';

export default function RankingScreen() {
  const userId = useUserId();
  const insets = useSafeAreaInsets();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => strengthApi.leaderboard(50), []);

  const me = data?.find((e) => e.userId === userId) ?? null;
  const ahead = me ? data?.find((e) => e.position === me.position - 1) ?? null : null;
  const rest = (data ?? []).filter((e) => e.position > 3);

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      overlay={data && data.length > 0 ? <StickyCta me={me} ahead={ahead} bottom={insets.bottom + 16} /> : null}
    >
      <Header title="Ranking" />
      <RankingTabs active="geral" />

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={5} /> : null}

      {data && data.length === 0 ? (
        <EmptyState
          icon="podium"
          title="Ninguém no ranking ainda"
          message="O ranking geral usa a nota de força. Registre séries em exercícios com rank para aparecer aqui."
          action="Ver meu rank"
          onAction={() => router.push('/rank')}
        />
      ) : null}

      {data && data.length > 0 ? (
        <>
          <Podium entries={data.slice(0, 3)} userId={userId} />
          {rest.length > 0 ? (
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {rest.map((e, i) => (
                <Row key={e.userId} entry={e} me={e.userId === userId} last={i === rest.length - 1} />
              ))}
            </Card>
          ) : null}
          <View style={{ height: 72 }} />
        </>
      ) : null}
    </Screen>
  );
}

function Row({ entry, me, last }: { entry: LeaderboardEntry; me: boolean; last: boolean }) {
  const info = RANKS[entry.rank];
  return (
    <View
      style={[styles.row, !last && styles.rowBorder, me && { backgroundColor: colors.accentSoft }]}
      accessibilityLabel={`${entry.position}º, ${me ? 'você' : entry.name}, ${info.label}, nota ${entry.score}`}
    >
      <Text style={[styles.pos, me && { color: colors.accent }]}>{entry.position}</Text>
      <RankBadge rank={entry.rank} size={26} />
      <Text style={[styles.name, me && { fontFamily: fonts.extrabold }]} numberOfLines={1}>
        {me ? 'Você' : shortName(entry.name)}
      </Text>
      <Text style={[styles.rankLabel, me && { color: info.color }]}>{info.label}</Text>
      <Text style={styles.score}>{entry.score}</Text>
    </View>
  );
}

const PODIUM = [
  { place: 2, height: 96, delay: 150, avatar: 48 },
  { place: 1, height: 128, delay: 300, avatar: 56 },
  { place: 3, height: 72, delay: 0, avatar: 48 },
];

function Podium({ entries, userId }: { entries: LeaderboardEntry[]; userId: number }) {
  const reduce = useReduceMotion();
  const grow = useRef(PODIUM.map(() => new Animated.Value(0))).current;
  const drop = useRef(PODIUM.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduce === null) return;
    if (reduce) {
      [...grow, ...drop].forEach((v) => v.setValue(1));
      return;
    }
    Animated.parallel(
      PODIUM.map((p, i) =>
        Animated.parallel([
          Animated.spring(grow[i], { toValue: 1, delay: p.delay, friction: 6, tension: 60, useNativeDriver: true }),
          Animated.timing(drop[i], { toValue: 1, delay: 800 + (3 - p.place) * 150, duration: 500, useNativeDriver: true }),
        ]),
      ),
    ).start();
  }, [reduce, grow, drop]);

  return (
    <View style={styles.podium} accessibilityLabel="Pódio">
      {PODIUM.map((p, i) => {
        const e = entries.find((x) => x.position === p.place);
        const color = PLACE_COLORS[p.place - 1];
        const first = p.place === 1;
        return (
          <View key={p.place} style={styles.podiumCol}>
            {e ? (
              <Animated.View
                style={[
                  styles.podiumPerson,
                  { opacity: drop[i], transform: [{ translateY: drop[i].interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] },
                ]}
              >
                {first ? (
                  <Svg width={22} height={16} viewBox="0 0 24 16">
                    <Path d="M2 14L0 2l7 5 5-7 5 7 7-5-2 12z" fill={color} />
                  </Svg>
                ) : null}
                <View style={[styles.avatar, { width: p.avatar, height: p.avatar, borderRadius: p.avatar / 2, borderColor: color }]}>
                  <Text style={[styles.avatarText, first && { fontSize: 15 }]}>{initials(e.name)}</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{e.userId === userId ? 'Você' : shortName(e.name)}</Text>
                <Text style={styles.podiumMeta} numberOfLines={1}>{e.score} · {RANKS[e.rank].label}</Text>
              </Animated.View>
            ) : null}
            <Animated.View
              style={[
                styles.block,
                { height: p.height, transformOrigin: 'bottom', transform: [{ scaleY: grow[i] }] },
                first && { backgroundColor: PLACE_BG, borderColor: PLACE_BORDER },
              ]}
            >
              <Text style={[styles.blockNum, { color, fontSize: first ? 26 : 22 }]}>{p.place}</Text>
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

function StickyCta({ me, ahead, bottom }: { me: LeaderboardEntry | null; ahead: LeaderboardEntry | null; bottom: number }) {
  let title: string;
  let subtitle: string;
  if (!me) {
    title = 'Você ainda não aparece aqui';
    subtitle = 'Registre séries em exercícios com rank';
  } else if (me.position === 1) {
    title = 'Você lidera o ranking!';
    subtitle = 'Continue treinando para manter o topo';
  } else {
    const diff = ahead ? Math.max(1, ahead.score - me.score) : null;
    title = diff != null ? `Faltam ${diff} ponto${diff > 1 ? 's' : ''} para o ${me.position - 1}º` : 'Suba no ranking';
    subtitle = 'Bata recordes para subir sua nota';
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/rank')}
      style={({ pressed }) => [styles.cta, { bottom, opacity: pressed ? 0.9 : 1 }]}
    >
      {me ? <Text style={styles.ctaPos}>{me.position}º</Text> : <Icon name="trophy" size={22} color={colors.onAccent} strokeWidth={2} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.ctaTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.ctaSub} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Icon name="chevronRight" size={18} color={colors.onAccent} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, minHeight: 52 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  pos: { width: 24, fontFamily: fonts.extrabold, fontSize: 15, color: colors.textMuted },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  rankLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  score: { width: 38, textAlign: 'right', fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  podium: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', height: 250 },
  podiumCol: { flex: 1, alignItems: 'center', gap: 8 },
  podiumPerson: { alignItems: 'center', gap: 4, alignSelf: 'stretch' },
  avatar: { backgroundColor: colors.surface2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.title, fontSize: 14, color: colors.text },
  podiumName: { fontFamily: fonts.bold, fontSize: 12, color: colors.text },
  podiumMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  block: {
    alignSelf: 'stretch',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderInput,
    alignItems: 'center',
    paddingTop: 10,
  },
  blockNum: { fontFamily: fonts.display },
  cta: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
  },
  ctaPos: { fontFamily: fonts.display, fontSize: 18, color: colors.onAccent },
  ctaTitle: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.onAccent },
  ctaSub: { fontFamily: fonts.bold, fontSize: 12, color: colors.onAccent, opacity: 0.75 },
});
