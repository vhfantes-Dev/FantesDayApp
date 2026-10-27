import { router } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { absoluteUrl } from '@/api/client';
import { trackingApi, userApi } from '@/api/endpoints';
import type { Dashboard, Task, WeightEntry } from '@/api/types';
import { useAuth, useUserId } from '@/auth/AuthContext';
import { WATER, WaterGlass } from '@/components/nutrition/WaterGlass';
import { Flame, FLAME_SIZE } from '@/components/rank/Flame';
import { useReduceMotion } from '@/components/rank/motion';
import { Avatar, ErrorBanner, RankBadge, Ring, Screen, SkeletonList, T } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { addDays, firstName, formatDecimal, formatNumber, hhmm, longDate, percent, today } from '@/utils/format';
import { RANKS, rankLabel } from '@/utils/ranks';

const STREAK = { bg: '#1A120A', border: '#4A3216', number: '#FFB25B', text: '#C9B39A', glow: '#FF6A1A' };

export default function HojeScreen() {
  const userId = useUserId();
  const { user } = useAuth();
  const reduceMotion = useReduceMotion();
  const animate = reduceMotion === false;
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => userApi.dashboard(userId), [userId]);
  // Série de 30 dias só para o mini gráfico do peso (falha em silêncio).
  const weights = useApi(() => trackingApi.weights(userId, addDays(today(), -30), today()).catch(() => null), [userId]);

  const name = data?.user.name ?? user?.name ?? '';

  return (
    <Screen withTabBar refreshing={refreshing} onRefresh={refresh} contentStyle={{ gap: 12 }}>
      <FadeIn animate={animate} ready={reduceMotion !== null} delay={0}>
        <View style={styles.header}>
          <View style={{ gap: 4, flex: 1 }}>
            <T variant="label" color={colors.textMuted}>{longDate(data?.date ?? today())}</T>
            <Text style={styles.hello} numberOfLines={1}>Olá, {firstName(name)}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Perfil" onPress={() => router.push('/perfil')} style={styles.avatarWrap}>
            <Avatar name={name} uri={absoluteUrl(data?.user.photoUrl ?? user?.photoUrl)} size={44} />
            {data ? (
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{data.progress.level}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </FadeIn>

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={4} /> : null}

      {data ? (
        <>
          <FadeIn animate={animate} ready={reduceMotion !== null} delay={50}>
            <CaloriesCard data={data} />
          </FadeIn>

          <FadeIn animate={animate} ready={reduceMotion !== null} delay={100} style={styles.row}>
            <LevelCard progress={data.progress} />
            <StreakCard data={data} animate={animate} />
          </FadeIn>

          <FadeIn animate={animate} ready={reduceMotion !== null} delay={150} style={styles.row}>
            <WaterTile water={data.water} animate={animate} />
            <WeightTile weight={data.weight} entries={weights.data?.entries ?? []} />
            <RankTile rank={data.strengthRank} />
          </FadeIn>

          <FadeIn animate={animate} ready={reduceMotion !== null} delay={200}>
            <TasksCard tasks={data.tasks} />
          </FadeIn>
        </>
      ) : null}
    </Screen>
  );
}

// Entrada suave (sobe 14 px e aparece). Sem animação com movimento reduzido.
function FadeIn({
  animate,
  ready,
  delay,
  style,
  children,
}: {
  animate: boolean;
  ready: boolean;
  delay: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!ready) return;
    if (!animate) {
      v.setValue(1);
      return;
    }
    const a = Animated.timing(v, { toValue: 1, duration: 700, delay, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [animate, ready, delay, v]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function CaloriesCard({ data }: { data: Dashboard }) {
  const { calories, bodyMetrics } = data;
  const budget = calories.target !== null ? calories.target + calories.burnedByActivities : null;
  const remaining = calories.remaining;
  const over = remaining !== null && remaining < 0;
  const tdee = bodyMetrics?.tdee ?? null;

  let caption: string;
  if (calories.target === null) caption = 'Complete o perfil para calcular sua meta';
  else if (calories.targetSource === 'TDEE') caption = 'Baseado no seu gasto diário (TDEE)';
  else if (tdee) {
    const diff = calories.target - tdee;
    const kind = diff < -100 ? 'Meta para perder peso' : diff > 100 ? 'Meta para ganhar peso' : 'Meta para manter o peso';
    caption = `${kind} · TDEE ${formatNumber(tdee)}`;
  } else caption = 'Meta diária de calorias';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={remaining !== null ? `${formatNumber(Math.abs(remaining))} kcal ${over ? 'acima da meta' : 'restantes'}` : 'Calorias de hoje'}
      onPress={() => router.push('/metabolismo')}
      style={({ pressed }) => [styles.card, styles.calories, pressed && { opacity: 0.9 }]}
    >
      <Ring value={percent(calories.consumed, budget)} size={120} stroke={10} color={over ? colors.danger : colors.carbs}>
        <Text style={styles.ringNumber}>{formatNumber(remaining !== null ? Math.abs(remaining) : calories.consumed)}</Text>
        <Text style={styles.ringLabel}>{remaining === null ? 'kcal consumidas' : over ? 'kcal acima' : 'kcal restantes'}</Text>
      </Ring>
      <View style={{ flex: 1, gap: 10 }}>
        <BalanceRow label="Meta" value={calories.target !== null ? formatNumber(calories.target) : '–'} />
        <BalanceRow label="Consumido" value={formatNumber(calories.consumed)} color={colors.carbs} />
        <BalanceRow label="Atividades" value={`+${formatNumber(calories.burnedByActivities)}`} color={colors.protein} />
        <Text style={styles.calCaption}>{caption}</Text>
      </View>
    </Pressable>
  );
}

function BalanceRow({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.balanceRow}>
      <Text style={styles.balanceLabel}>{label}</Text>
      <Text style={[styles.balanceValue, { color }]}>{value}</Text>
    </View>
  );
}

function LevelCard({ progress }: { progress: Dashboard['progress'] }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Nível ${progress.level}, ${progress.xpToNextLevel} XP para o próximo`}
      onPress={() => router.push('/perfil')}
      style={({ pressed }) => [styles.card, styles.half, pressed && { opacity: 0.9 }]}
    >
      <Ring value={progress.levelProgressPercent} size={76} stroke={7}>
        <Text style={styles.levelNumber}>{progress.level}</Text>
        <Text style={styles.levelLabel}>NÍVEL</Text>
      </Ring>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.tileStrong}>{formatNumber(progress.xpToNextLevel)} XP</Text>
        <Text style={styles.tileSmall}>para o nível {progress.level + 1}</Text>
      </View>
    </Pressable>
  );
}

const FLAME_SCALE = 0.22;

function StreakCard({ data, animate }: { data: Dashboard; animate: boolean }) {
  const { streak, workouts } = data;
  const week = workouts?.thisWeek ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sequência de ${streak.currentStreakDays} dias, ${week} treinos na semana`}
      onPress={() => router.push('/celebracao/sequencia')}
      style={({ pressed }) => [styles.half, styles.streak, pressed && { opacity: 0.9 }]}
    >
      <View pointerEvents="none" style={styles.streakGlow} />
      <View style={{ width: FLAME_SIZE.width * FLAME_SCALE, height: FLAME_SIZE.height * FLAME_SCALE }}>
        <View style={{ position: 'absolute', left: 0, top: 0, transformOrigin: 'left top', transform: [{ scale: FLAME_SCALE }] }}>
          <Flame animate={animate && streak.active} dim={!streak.active} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.streakNumber}>{streak.currentStreakDays}</Text>
        <Text style={styles.streakText}>
          {streak.currentStreakDays === 1 ? 'dia seguido' : 'dias seguidos'} · {week} {week === 1 ? 'treino' : 'treinos'} na semana
        </Text>
      </View>
    </Pressable>
  );
}

function liters(ml: number) {
  return `${formatDecimal(ml / 1000, 1)} L`;
}

function WaterTile({ water, animate }: { water: Dashboard['water']; animate: boolean }) {
  const pct = percent(water.totalMl, water.goalMl);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Água: ${liters(water.totalMl)}${water.goalMl ? ` de ${liters(water.goalMl)}` : ''}`}
      onPress={() => router.push('/agua')}
      style={({ pressed }) => [styles.tile, styles.waterTile, pressed && { opacity: 0.9 }]}
    >
      <WaterGlass width={46} percent={pct} background={WATER.card} animate={animate} strokeWidth={2} />
      <Text style={styles.tileStrong}>{liters(water.totalMl)}</Text>
      <Text style={[styles.tileTiny, { color: WATER.muted }]} numberOfLines={1}>
        {water.goalMl ? `de ${liters(water.goalMl)} · ${Math.round(pct)}%` : 'sem meta'}
      </Text>
    </Pressable>
  );
}

function WeightTile({ weight, entries }: { weight: Dashboard['weight']; entries: WeightEntry[] }) {
  const change = weight?.changeLast30Days ?? null;
  const current = weight?.currentKg ?? null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  let points = '';
  let last: [number, number] | null = null;
  if (sorted.length >= 2) {
    const vals = sorted.map((e) => e.weightKg);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const pts = sorted.map((e, i) => {
      const x = 2 + (i / (sorted.length - 1)) * 80;
      const y = 4 + (1 - (e.weightKg - min) / span) * 20;
      return [x, y] as [number, number];
    });
    points = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    last = pts[pts.length - 1];
  }
  const changeText =
    change === null ? 'Sem histórico' : `${change > 0 ? '+' : change < 0 ? '−' : ''}${formatNumber(Math.abs(change), 1)} kg em 30 dias`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={current !== null ? `Peso ${formatNumber(current, 1)} kg, ${changeText}` : 'Registrar peso'}
      onPress={() => router.push('/peso')}
      style={({ pressed }) => [styles.tile, styles.card, { alignItems: 'stretch', paddingHorizontal: 10 }, pressed && { opacity: 0.9 }]}
    >
      <Text style={styles.overline}>PESO</Text>
      <View style={{ height: 28, justifyContent: 'center' }}>
        {points && last ? (
          <Svg width="100%" height={28} viewBox="0 0 86 28" preserveAspectRatio="none">
            <Polyline points={points} fill="none" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={last[0]} cy={last[1]} r={3} fill={colors.accent} />
          </Svg>
        ) : (
          <View style={{ height: 2, borderRadius: 1, backgroundColor: colors.border }} />
        )}
      </View>
      <Text style={styles.tileStrong}>{current !== null ? `${formatNumber(current, 1)} kg` : '–'}</Text>
      <Text style={[styles.tileTiny, { fontFamily: fonts.bold, color: change !== null ? colors.accent : colors.textMuted }]} numberOfLines={1}>
        {current !== null ? changeText : 'Registrar peso'}
      </Text>
    </Pressable>
  );
}

function RankTile({ rank }: { rank: Dashboard['strengthRank'] }) {
  const info = rank ? RANKS[rank.rank] : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rank ? `Rank ${rankLabel(rank.rank)}` : 'Rank de força'}
      onPress={() => router.push('/rank')}
      style={({ pressed }) => [styles.tile, styles.card, { gap: 4, paddingVertical: 10 }, pressed && { opacity: 0.9 }]}
    >
      <RankBadge rank={rank?.rank} size={52} locked={!rank} />
      <Text style={[styles.tileStrong, info ? { color: info.color } : null]} numberOfLines={1}>
        {rank ? rankLabel(rank.rank) : 'Sem rank'}
      </Text>
      <Text style={styles.tileTiny} numberOfLines={1}>
        {rank ? `${rank.score} · ${rank.lp} LP` : 'Treine para ranquear'}
      </Text>
    </Pressable>
  );
}

function nextTask(items: Task[]) {
  const pending = items.filter((t) => !t.completed);
  const timed = pending.filter((t) => t.time).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  return timed[0] ?? pending[0] ?? null;
}

function TasksCard({ tasks }: { tasks: Dashboard['tasks'] }) {
  const next = nextTask(tasks.items);
  const segments = Math.min(tasks.total, 12);
  const done = tasks.total ? Math.round((tasks.completed / tasks.total) * segments) : 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tarefas de hoje: ${tasks.completed} de ${tasks.total}`}
      onPress={() => router.push('/tarefas')}
      style={({ pressed }) => [styles.card, styles.tasks, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.tasksHead}>
        <Text style={styles.tileStrong}>Tarefas de hoje</Text>
        <Text style={[styles.tileStrong, { fontSize: 13, color: colors.accent }]}>
          {tasks.total ? `${tasks.completed} de ${tasks.total}` : 'Criar'}
        </Text>
      </View>
      {segments > 0 ? (
        <View style={styles.segments}>
          {Array.from({ length: segments }).map((_, i) => (
            <View key={i} style={[styles.segment, i < done && { backgroundColor: colors.accent }]} />
          ))}
        </View>
      ) : null}
      <View style={styles.tasksHead}>
        <Text style={styles.nextText} numberOfLines={1}>
          {tasks.total === 0 ? 'Nenhuma tarefa para hoje' : next ? `Próxima: ${next.title}` : 'Tudo concluído hoje'}
        </Text>
        {next?.time ? <Text style={styles.nextTime}>{hhmm(next.time)}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  hello: { fontFamily: fonts.title, fontSize: 24, letterSpacing: -0.5, color: colors.text },
  avatarWrap: { borderWidth: 2, borderColor: colors.accent, borderRadius: 16, padding: 0, overflow: 'visible' },
  levelBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  levelBadgeText: { fontFamily: fonts.extrabold, fontSize: 10, color: colors.onAccent },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  calories: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 24 },
  ringNumber: { fontFamily: fonts.display, fontSize: 22, color: colors.text, lineHeight: 26 },
  ringLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted, marginTop: 3 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  balanceValue: { fontFamily: fonts.extrabold, fontSize: 13 },
  calCaption: { fontFamily: fonts.regular, fontSize: 11, color: colors.textDone },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22 },
  levelNumber: { fontFamily: fonts.display, fontSize: 22, color: colors.text, lineHeight: 26 },
  levelLabel: { fontFamily: fonts.extrabold, fontSize: 9, letterSpacing: 0.7, color: colors.textMuted, marginTop: 1 },
  tileStrong: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.text },
  tileSmall: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, color: colors.textMuted },
  tileTiny: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  streak: { backgroundColor: STREAK.bg, borderWidth: 1, borderColor: STREAK.border, overflow: 'hidden', gap: 10 },
  streakGlow: { position: 'absolute', left: -10, top: 10, width: 90, height: 70, borderRadius: 45, backgroundColor: STREAK.glow, opacity: 0.18 },
  streakNumber: { fontFamily: fonts.display, fontSize: 22, color: STREAK.number, lineHeight: 26 },
  streakText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, color: STREAK.text },
  tile: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 20 },
  waterTile: { backgroundColor: WATER.card, borderWidth: 1, borderColor: WATER.cardBorder },
  overline: { fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 0.8, color: colors.textMuted },
  tasks: { gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 22 },
  tasksHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 99, backgroundColor: colors.border },
  nextText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textSoft },
  nextTime: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
});
