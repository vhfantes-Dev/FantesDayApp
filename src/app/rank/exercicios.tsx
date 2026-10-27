import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { exerciseApi, strengthApi } from '@/api/endpoints';
import type { Exercise, ExerciseRank } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Card, Chip, ChipRow, EmptyState, ErrorBanner, Header, ProgressBar, RankBadge, Screen, SkeletonList, T } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { formatDecimal } from '@/utils/format';
import { MUSCLE_GROUPS, rankProgress, RANKS } from '@/utils/ranks';

interface Item {
  exercise: Exercise;
  rank: ExerciseRank | null;
}

export default function RanksExerciciosScreen() {
  const userId = useUserId();
  const [filter, setFilter] = useState<string | null>(null);
  const { data, error, loading, refreshing, refresh, reload } = useApi(async () => {
    const [ranked, profile] = await Promise.all([
      exerciseApi.ranked(),
      strengthApi.profile(userId).catch(() => null),
    ]);
    const byId = new Map((profile?.exercises ?? []).map((e) => [e.exerciseId, e]));
    const items: Item[] = ranked.map((exercise) => ({ exercise, rank: byId.get(exercise.id) ?? null }));
    items.sort((a, b) => {
      if (a.rank && b.rank) return b.rank.rank.score - a.rank.rank.score;
      if (a.rank) return -1;
      if (b.rank) return 1;
      return a.exercise.name.localeCompare(b.exercise.name, 'pt-BR');
    });
    return items;
  }, [userId]);

  const groups = useMemo(() => {
    const set = new Set((data ?? []).map((i) => i.exercise.muscleGroup).filter((g): g is string => !!g));
    return [...set].sort((a, b) => order(a) - order(b));
  }, [data]);

  const visible = (data ?? []).filter((i) => !filter || i.exercise.muscleGroup === filter);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Ranks por exercício" />

      {groups.length > 1 ? (
        <ChipRow>
          <Chip label="Todos" active={!filter} onPress={() => setFilter(null)} />
          {groups.map((g) => (
            <Chip key={g} label={g} active={filter === g} onPress={() => setFilter(g)} />
          ))}
        </ChipRow>
      ) : null}

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={5} /> : null}

      {data && visible.length === 0 ? (
        <EmptyState icon="dumbbell" title="Nenhum exercício com rank" message="A lista de exercícios com rank está vazia no momento." />
      ) : null}

      <View style={{ gap: 10 }}>
        {visible.map((item) => (item.rank ? <RankedCard key={item.exercise.id} item={item} rank={item.rank} /> : <LockedCard key={item.exercise.id} item={item} />))}
      </View>
    </Screen>
  );
}

function order(group: string) {
  const i = MUSCLE_GROUPS.indexOf(group);
  return i === -1 ? 99 : i;
}

function openHistory(id: number) {
  router.push({ pathname: '/exercicios/historico/[id]', params: { id: String(id) } });
}

function RankedCard({ item, rank }: { item: Item; rank: ExerciseRank }) {
  const info = RANKS[rank.rank.rank];
  const r = rank.rank;
  const close = r.nextRank && r.lp >= 90;
  const subtitle = [
    item.exercise.muscleGroup,
    rank.bestOneRepMax != null ? `1RM ${formatDecimal(rank.bestOneRepMax)} kg` : null,
    rank.bodyweightRatio != null ? `${formatDecimal(rank.bodyweightRatio, 2)}×` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const hint = r.nextRank
    ? close
      ? `${info.label} · ${r.lp} LP · falta pouco para ${RANKS[r.nextRank].label}!`
      : `${info.label} · ${r.lp} LP · ${RANKS[r.nextRank].label} em ${100 - r.lp} LP`
    : `${info.label} · ${r.lp} LP · rank máximo`;
  return (
    <Card onPress={() => openHistory(item.exercise.id)} style={{ gap: 10, padding: 14 }}>
      <View style={styles.row}>
        <RankBadge rank={r.rank} size={44} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.name} numberOfLines={2}>{item.exercise.name}</Text>
          <OriginalName exercise={item.exercise} />
          <T variant="caption">{subtitle}</T>
        </View>
        <Text style={[styles.score, { color: info.color }]}>{r.score}</Text>
      </View>
      <ProgressBar value={rankProgress(r.rank, r.lp)} color={info.color} height={6} />
      <T variant="caption" color={close ? colors.accent : undefined} style={close ? { fontFamily: fonts.bold } : null}>
        {hint}
      </T>
    </Card>
  );
}

// Nome original (inglês) quando difere do nome em português.
function OriginalName({ exercise }: { exercise: Exercise }) {
  if (!exercise.nameEn || exercise.nameEn.trim().toLowerCase() === exercise.name.trim().toLowerCase()) return null;
  return (
    <Text style={styles.nameEn} numberOfLines={1}>
      {exercise.nameEn}
    </Text>
  );
}

function LockedCard({ item }: { item: Item }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openHistory(item.exercise.id)}
      style={({ pressed }) => [styles.locked, pressed && { opacity: 0.8 }]}
    >
      <RankBadge rank={null} size={44} locked />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.name, { fontFamily: fonts.bold, color: colors.textSoft }]} numberOfLines={2}>{item.exercise.name}</Text>
        <OriginalName exercise={item.exercise} />
        <T variant="caption">
          {item.exercise.muscleGroup ? `${item.exercise.muscleGroup} · ` : ''}Sem séries ainda · registre 1 para ganhar rank
        </T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.text },
  nameEn: { fontFamily: fonts.medium, fontSize: 11, color: colors.textDone },
  score: { fontFamily: fonts.title, fontSize: 15 },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
  },
});
