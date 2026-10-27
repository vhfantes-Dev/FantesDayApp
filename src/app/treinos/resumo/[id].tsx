import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { strengthApi, workoutApi } from '@/api/endpoints';
import type { Streak, StrengthProfile, Workout, WorkoutExercise, WorkoutSet } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, Card, ErrorBanner, IconButton, LoadingView, RankBadge, Screen, T } from '@/components/ui';
import { parseTimestamp } from '@/components/workouts/labels';
import { GOLD, STREAK, setLabel, volumeOf } from '@/components/workouts/parts';
import { forgetSession, peekSession } from '@/components/workouts/session';
import { useApi } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';
import { formatNumber, shortDate, weekdayShort } from '@/utils/format';
import { RANKS, rankLabel } from '@/utils/ranks';

interface SummaryData {
  workout: Workout;
  items: { we: WorkoutExercise; sets: WorkoutSet[] }[];
  streak: Streak | null;
  profile: StrengthProfile | null;
}

export default function ResumoTreinoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  const userId = useUserId();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  const { data, error, loading, reload } = useApi<SummaryData>(async () => {
    const [workout, exercises, streak, profile] = await Promise.all([
      workoutApi.get(workoutId),
      workoutApi.exercises(workoutId),
      strengthApi.streak(userId).catch(() => null),
      strengthApi.profile(userId).catch(() => null),
    ]);
    const sets = await Promise.all(exercises.map((we) => workoutApi.sets(we.id)));
    return { workout, items: exercises.map((we, i) => ({ we, sets: sets[i] })), streak, profile };
  }, [workoutId, userId]);

  function confirmDelete() {
    Alert.alert('Excluir treino?', 'As séries serão apagadas e o XP deste treino será removido.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await workoutApi.remove(workoutId);
            forgetSession(workoutId);
            toast.success('Treino excluído');
            router.dismissTo('/treinos');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Não foi possível excluir o treino.');
            setDeleting(false);
          }
        },
      },
    ]);
  }

  const allSets = data?.items.flatMap((i) => i.sets) ?? [];
  const volume = volumeOf(allSets);
  const prs = allSets.filter((s) => s.personalRecord).length;
  const minutes = durationMinutes(workoutId, allSets);
  const overall = data?.profile?.overall;

  return (
    <Screen
      glow="none"
      footer={
        data ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Ver sequência" variant="secondary" icon="flame" onPress={() => router.push('/celebracao/sequencia')} style={{ flex: 1 }} />
            <Button title="Concluir" onPress={() => router.dismissTo('/treinos')} style={{ flex: 1 }} />
          </View>
        ) : null
      }
      contentStyle={{ gap: 14 }}
    >
      <View pointerEvents="none" style={styles.glow} />
      <View style={styles.topBar}>
        <IconButton icon="close" label="Fechar" onPress={() => router.dismissTo('/treinos')} />
        {data ? <IconButton icon="trash" label="Excluir treino" color={colors.danger} onPress={confirmDelete} style={deleting ? { opacity: 0.5 } : null} /> : null}
      </View>

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <LoadingView /> : null}

      {data ? (
        <>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Icon name="check" size={40} color={colors.onAccent} strokeWidth={2.6} />
            </View>
            <Text style={styles.title}>Treino concluído</Text>
            <T variant="caption" style={{ fontSize: 14, textAlign: 'center' }}>
              {data.workout.workoutType || 'Treino'} · {weekdayShort(data.workout.date).toLowerCase()}, {shortDate(data.workout.date)}
            </T>
          </View>

          <View style={styles.stats}>
            {minutes !== null ? (
              <StatBox value={`${minutes} min`} label="duração" />
            ) : (
              <StatBox value={String(data.items.length)} label={data.items.length === 1 ? 'exercício' : 'exercícios'} />
            )}
            <StatBox value={formatNumber(volume)} label="kg de volume" />
            <StatBox value={String(allSets.length)} label={allSets.length === 1 ? 'série' : 'séries'} />
          </View>

          <Text style={styles.overline}>RECOMPENSAS</Text>

          {data.streak ? (
            <RewardRow
              onPress={() => router.push('/celebracao/sequencia')}
              style={{ backgroundColor: STREAK.bg, borderColor: STREAK.border }}
              left={<Icon name="flame" size={32} color={STREAK.flame} fill={STREAK.flame} />}
              title={`Sequência de ${data.streak.currentStreakDays} ${data.streak.currentStreakDays === 1 ? 'dia' : 'dias'}`}
              subtitle={`${data.streak.workoutsInCurrentStreak} treinos na sequência · recorde: ${data.streak.longestStreakDays}`}
              subtitleColor={STREAK.soft}
              value={data.streak.active && data.streak.lastWorkoutDate === data.workout.date ? '+1' : ''}
              valueColor={STREAK.text}
            />
          ) : null}

          <RewardRow
            onPress={() => router.push('/rank')}
            left={<RankBadge rank={overall?.rank} size={35} locked={!overall} />}
            title={`Rank de força · ${rankLabel(overall?.rank)}`}
            subtitle={prs ? `${prs} ${prs === 1 ? 'recorde pessoal' : 'recordes pessoais'} hoje` : 'Nenhum recorde neste treino'}
            value={overall ? `${overall.lp} LP` : ''}
            valueColor={overall ? RANKS[overall.rank].color : colors.textMuted}
          />

          <RewardRow
            style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }}
            left={
              <View style={styles.xpBox}>
                <Text style={styles.xpBoxText}>XP</Text>
              </View>
            }
            title="XP do treino"
            subtitle={data.workout.xpEarned ? 'Somado ao seu nível' : 'Registre séries e finalize para ganhar XP'}
            subtitleColor={colors.textLabel}
            value={`+${data.workout.xpEarned ?? 0}`}
            valueColor={colors.accent}
          />

          {data.items.length > 0 ? (
            <>
              <Text style={[styles.overline, { marginTop: 4 }]}>EXERCÍCIOS</Text>
              <Card padded={false} style={{ overflow: 'hidden' }}>
                {data.items.map((item, i) => {
                  const best = item.sets.reduce<WorkoutSet | null>((b, s) => ((s.estimatedOneRepMax ?? 0) > (b?.estimatedOneRepMax ?? -1) ? s : b), null);
                  const hasPr = item.sets.some((s) => s.personalRecord);
                  return (
                    <View key={item.we.id} style={[styles.exRow, i < data.items.length - 1 && styles.exRowBorder]}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T style={{ fontFamily: fonts.bold, fontSize: 14 }} numberOfLines={1}>{item.we.exerciseName}</T>
                        <T variant="caption">
                          {item.sets.length ? `${item.sets.length} ${item.sets.length === 1 ? 'série' : 'séries'}${best ? ` · melhor ${setLabel(best)}` : ''}` : 'Sem séries'}
                        </T>
                      </View>
                      {hasPr ? (
                        <View style={styles.prTag} accessibilityLabel="Recorde pessoal">
                          <Icon name="trophy" size={14} color={colors.onAccent} strokeWidth={2.4} />
                          <Text style={styles.prTagText}>PR</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </Card>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

// Duração: pelo relógio do treino ao vivo; senão, da primeira à última série.
function durationMinutes(workoutId: number, sets: WorkoutSet[]) {
  const s = peekSession(workoutId);
  if (s?.finishedAt) return Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000));
  const times = sets.map((x) => parseTimestamp(x.createdAt)).filter((t): t is number => t !== null).sort((a, b) => a - b);
  if (times.length < 2) return null;
  const mins = Math.round((times[times.length - 1] - times[0]) / 60000);
  return mins >= 1 ? mins : null;
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <T variant="caption" style={{ fontSize: 11 }}>{label}</T>
    </View>
  );
}

function RewardRow({
  left,
  title,
  subtitle,
  value,
  valueColor,
  subtitleColor,
  onPress,
  style,
}: {
  left: ReactNode;
  title: string;
  subtitle: string;
  value: string;
  valueColor: string;
  subtitleColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.reward, style, pressed && { opacity: 0.85 }]}
    >
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rewardTitle}>{title}</Text>
        <Text style={[styles.rewardSub, subtitleColor ? { color: subtitleColor } : null]}>{subtitle}</Text>
      </View>
      {value ? <Text style={[styles.rewardValue, { color: valueColor }]}>{value}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: 340,
    height: 300,
    borderRadius: 170,
    backgroundColor: colors.accent,
    opacity: 0.08,
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between' },
  hero: { alignItems: 'center', gap: 10 },
  heroIcon: { width: 76, height: 76, borderRadius: 26, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.text, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
  overline: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1, color: colors.textMuted, marginTop: 4 },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rewardTitle: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.text },
  rewardSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  rewardValue: { fontFamily: fonts.title, fontSize: 16 },
  xpBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  xpBoxText: { fontFamily: fonts.display, fontSize: 13, color: colors.onAccent },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  exRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  prTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GOLD.color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  prTagText: { fontFamily: fonts.extrabold, fontSize: 11, color: colors.onAccent },
});
