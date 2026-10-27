import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { exerciseApi, strengthApi } from '@/api/endpoints';
import type { ExerciseHistoryPoint, ExerciseRank } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { BarChart, LineChart, type ChartPoint } from '@/components/rank/Charts';
import { Card, EmptyState, ErrorBanner, IconButton, RankBadge, Screen, SkeletonList, T } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { formatDecimal, formatNumber, shortDate } from '@/utils/format';
import { RANKS } from '@/utils/ranks';

const PR_COLOR = '#F2C94C';

export default function HistoricoExercicioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exerciseId = Number(id);
  const userId = useUserId();
  const { data, error, loading, refreshing, refresh, reload } = useApi(async () => {
    const [exercise, history, profile] = await Promise.all([
      exerciseApi.get(exerciseId),
      strengthApi.history(userId, exerciseId),
      strengthApi.profile(userId).catch(() => null),
    ]);
    const sorted = [...history].sort((a, b) => (a.date < b.date ? -1 : 1));
    return { exercise, history: sorted, rank: profile?.exercises.find((e) => e.exerciseId === exerciseId) ?? null };
  }, [userId, exerciseId]);

  const exercise = data?.exercise;
  const subtitle = exercise ? [exercise.muscleGroup, exercise.secondaryMuscles].filter(Boolean).join(' · ') : '';

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <IconButton icon="back" label="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/rank/exercicios'))} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title} numberOfLines={2}>{exercise?.name ?? 'Evolução'}</Text>
          {exercise?.nameEn && exercise.nameEn.trim().toLowerCase() !== exercise.name.trim().toLowerCase() ? (
            <T variant="caption" color={colors.textDone} style={{ fontSize: 11 }}>{exercise.nameEn}</T>
          ) : null}
          {subtitle ? <T variant="caption">{subtitle}</T> : null}
        </View>
      </View>

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={4} /> : null}

      {data ? <Content history={data.history} rank={data.rank} /> : null}
    </Screen>
  );
}

function Content({ history, rank }: { history: ExerciseHistoryPoint[]; rank: ExerciseRank | null }) {
  const oneRm: ChartPoint[] = history.filter((h) => h.bestOneRepMax != null).map((h) => ({ date: h.date, value: h.bestOneRepMax! }));
  const volume: ChartPoint[] = history.filter((h) => h.volumeKg != null).map((h) => ({ date: h.date, value: h.volumeKg! })).slice(-12);
  const best = rank?.bestOneRepMax ?? (oneRm.length ? Math.max(...oneRm.map((p) => p.value)) : null);
  const info = rank ? RANKS[rank.rank.rank] : null;
  const delta = oneRm.length > 1 ? oneRm[oneRm.length - 1].value - oneRm[0].value : null;

  // Marca PR quando o 1RM do dia supera todos os anteriores.
  let runningMax = 0;
  const sessions = history.map((h, i) => {
    const pr = h.bestOneRepMax != null && h.bestOneRepMax > runningMax && i > 0;
    if (h.bestOneRepMax != null) runningMax = Math.max(runningMax, h.bestOneRepMax);
    return { ...h, pr };
  });
  const recent = sessions.reverse().slice(0, 10);

  return (
    <>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{best != null ? formatDecimal(best) : '–'}</Text>
          <T variant="caption" style={{ fontSize: 11 }}>melhor 1RM (kg)</T>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{rank?.bodyweightRatio != null ? `${formatDecimal(rank.bodyweightRatio, 2)}×` : '–'}</Text>
          <T variant="caption" style={{ fontSize: 11 }}>peso corporal</T>
        </View>
        {rank && info ? (
          <View style={[styles.stat, { backgroundColor: `${info.color}1A`, borderColor: `${info.color}66` }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <RankBadge rank={rank.rank.rank} size={20} />
              <Text style={[styles.statValue, { color: info.color, flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>{info.label}</Text>
            </View>
            <T variant="caption" color={colors.textLabel} style={{ fontSize: 11 }}>nota {rank.rank.score} · {rank.rank.lp} LP</T>
          </View>
        ) : (
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.textMuted }]}>–</Text>
            <T variant="caption" style={{ fontSize: 11 }}>sem rank</T>
          </View>
        )}
      </View>

      {history.length === 0 ? (
        <EmptyState
          icon="trendUp"
          title="Nenhuma série registrada"
          message="Registre séries deste exercício em um treino para ver a evolução do 1RM e do volume."
          action="Começar treino"
          onAction={() => router.push('/treinos/novo')}
        />
      ) : (
        <>
          {oneRm.length > 0 ? (
            <Card style={{ gap: 10 }}>
              <View style={styles.between}>
                <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>1RM estimado (kg)</T>
                {delta != null ? (
                  <Text style={[styles.delta, { color: delta >= 0 ? colors.accent : colors.danger }]}>
                    {delta >= 0 ? '+' : ''}{formatDecimal(delta)} kg em {oneRm.length} treinos
                  </Text>
                ) : null}
              </View>
              <LineChart
                points={oneRm}
                highlight={PR_COLOR}
                label={`1RM estimado de ${formatDecimal(oneRm[0].value)} kg em ${shortDate(oneRm[0].date)} para ${formatDecimal(oneRm[oneRm.length - 1].value)} kg em ${shortDate(oneRm[oneRm.length - 1].date)}`}
              />
            </Card>
          ) : null}

          {volume.length > 0 ? (
            <Card style={{ gap: 10 }}>
              <View style={styles.between}>
                <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>Volume por treino (kg)</T>
                <T variant="caption">último: {formatNumber(volume[volume.length - 1].value)} kg</T>
              </View>
              <BarChart points={volume} label={`Volume dos últimos ${volume.length} treinos`} />
            </Card>
          ) : null}

          <View style={{ gap: 10 }}>
            <T variant="overline">ÚLTIMOS TREINOS</T>
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {recent.map((s, i) => (
                <View key={s.date} style={[styles.session, i < recent.length - 1 && styles.rowBorder]}>
                  <Text style={styles.sessionDate}>{shortDate(s.date)}</Text>
                  <Text style={styles.sessionVolume}>Volume {formatNumber(s.volumeKg)} kg</Text>
                  <Text style={styles.sessionRm}>{formatDecimal(s.bestOneRepMax)}</Text>
                  {s.pr ? (
                    <View style={styles.pr}>
                      <Text style={styles.prText}>PR</Text>
                    </View>
                  ) : (
                    <View style={{ width: 24 }} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  statValue: { fontFamily: fonts.title, fontSize: 17, color: colors.text },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  delta: { fontFamily: fonts.bold, fontSize: 12 },
  session: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  sessionDate: { width: 56, fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  sessionVolume: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.textSoft },
  sessionRm: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  pr: { width: 24, alignItems: 'center', paddingVertical: 2, borderRadius: 6, backgroundColor: PR_COLOR },
  prText: { fontFamily: fonts.extrabold, fontSize: 10, color: colors.onAccent },
});
