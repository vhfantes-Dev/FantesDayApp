import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strengthApi, userApi, workoutApi } from '@/api/endpoints';
import type { ExerciseRank, Workout, WorkoutExercise, WorkoutSet } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, EmptyState, ErrorBanner, IconButton, ProgressBar, RankBadge, Screen, SkeletonList, T } from '@/components/ui';
import { clock, parseTimestamp } from '@/components/workouts/labels';
import { DONE_ROW, GOLD, SetEditSheet, setLabel } from '@/components/workouts/parts';
import { finishSession, getSession } from '@/components/workouts/session';
import { useApi } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';
import { formatDecimal, parseNumber } from '@/utils/format';
import { RANK_ORDER, RANKS, rankLabel, rankProgress } from '@/utils/ranks';

interface Item {
  we: WorkoutExercise;
  sets: WorkoutSet[];
}

interface LiveData {
  workout: Workout;
  items: Item[];
}

const DEFAULT_REST = 90;
const FINISH_XP = 50;

export default function TreinoAoVivoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  const userId = useUserId();
  const toast = useToast();
  const session = getSession(workoutId);

  const { data, error, loading, reload, setData } = useApi<LiveData>(async () => {
    const [workout, exercises] = await Promise.all([workoutApi.get(workoutId), workoutApi.exercises(workoutId)]);
    const sets = await Promise.all(exercises.map((we) => workoutApi.sets(we.id)));
    return { workout, items: exercises.map((we, i) => ({ we, sets: sets[i] })) };
  }, [workoutId]);

  // Rank de cada exercício antes das séries de hoje (para detectar subida de rank).
  const ranks = useRef<Record<number, ExerciseRank>>({});
  const initialScore = useRef<Record<number, number>>({});
  const [, forceRank] = useState(0);
  useEffect(() => {
    let alive = true;
    strengthApi
      .profile(userId)
      .then((p) => {
        if (!alive) return;
        for (const r of p.exercises) {
          if (!ranks.current[r.exerciseId]) ranks.current[r.exerciseId] = r;
          if (initialScore.current[r.exerciseId] === undefined) initialScore.current[r.exerciseId] = r.rank.score;
        }
        forceRank((n) => n + 1);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [userId]);

  // Relógio: tempo de treino e descanso.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Se já há séries antigas, o treino começou na primeira delas.
  useEffect(() => {
    if (!data) return;
    const first = data.items
      .flatMap((i) => i.sets)
      .map((s) => parseTimestamp(s.createdAt))
      .filter((t): t is number => t !== null && t <= Date.now() && Date.now() - t < 12 * 3600 * 1000)
      .sort((a, b) => a - b)[0];
    if (first && first < session.startedAt) session.startedAt = first;
  }, [data, session]);

  const [expanded, setExpanded] = useState<number | null>(null);
  useEffect(() => {
    if (expanded === null && data?.items.length) {
      const open = data.items.find((i) => {
        const target = session.targets[i.we.id]?.sets;
        return target ? i.sets.length < target : i.sets.length === 0;
      });
      setExpanded((open ?? data.items[0]).we.id);
    }
  }, [data, expanded, session]);

  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const restLeft = rest ? Math.ceil((rest.endsAt - now) / 1000) : 0;
  useEffect(() => {
    if (rest && restLeft <= 0) {
      setRest(null);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [rest, restLeft]);

  const [pr, setPr] = useState<{ title: string; detail: string } | null>(null);
  const [editing, setEditing] = useState<{ set: WorkoutSet; index: number } | null>(null);
  const [finishing, setFinishing] = useState(false);

  function patchSets(weId: number, fn: (sets: WorkoutSet[]) => WorkoutSet[]) {
    setData((d) => (d ? { ...d, items: d.items.map((i) => (i.we.id === weId ? { ...i, sets: fn(i.sets) } : i)) } : d!));
  }

  async function logSet(item: Item, reps: number, kg: number | null) {
    const before = ranks.current[item.we.exerciseId];
    const bestBefore = Math.max(before?.bestOneRepMax ?? 0, ...item.sets.map((s) => s.estimatedOneRepMax ?? 0));
    const set = await workoutApi.addSet(item.we.id, { reps, weightKg: kg });
    patchSets(item.we.id, (sets) => [...sets, set]);

    setRest({ endsAt: Date.now() + (session.rest[item.we.id] ?? DEFAULT_REST) * 1000, total: session.rest[item.we.id] ?? DEFAULT_REST });

    if (set.personalRecord && set.estimatedOneRepMax) {
      const gain = bestBefore > 0 ? set.estimatedOneRepMax - bestBefore : 0;
      setPr({
        title: 'Recorde pessoal!',
        detail: `1RM estimado ${formatDecimal(set.estimatedOneRepMax)} kg${gain > 0 ? ` · +${formatDecimal(gain)} kg` : ''}`,
      });
    }

    if (set.rank) {
      const from = before?.rank.rank;
      const to = set.rank.rank.rank;
      if (initialScore.current[item.we.exerciseId] === undefined) initialScore.current[item.we.exerciseId] = before?.rank.score ?? set.rank.rank.score;
      ranks.current[item.we.exerciseId] = set.rank;
      forceRank((n) => n + 1);
      if (from && RANK_ORDER.indexOf(to) > RANK_ORDER.indexOf(from)) {
        router.push({
          pathname: '/celebracao/rank',
          params: { exerciseName: set.exerciseName, from, to, score: String(set.rank.rank.score) },
        });
      }
    }
  }

  function finish() {
    const totalSets = data?.items.reduce((n, i) => n + i.sets.length, 0) ?? 0;
    const go = async () => {
      setFinishing(true);
      try {
        finishSession(workoutId);
        let levelUp: { level: number; xp: number } | null = null;
        // Treinos iniciados pela rotina chegam sem XP: dá o XP padrão ao concluir.
        if (data && totalSets > 0 && !data.workout.xpEarned) {
          const before = await userApi.progress(userId).catch(() => null);
          await workoutApi.update(workoutId, { xpEarned: FINISH_XP });
          const after = await userApi.progress(userId).catch(() => null);
          if (before && after && after.level > before.level) levelUp = { level: after.level, xp: after.totalXp };
        }
        router.replace({ pathname: '/treinos/resumo/[id]', params: { id: String(workoutId) } });
        if (levelUp) {
          router.push({ pathname: '/celebracao/nivel', params: { level: String(levelUp.level), xp: String(levelUp.xp) } });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Não foi possível finalizar o treino.');
      } finally {
        setFinishing(false);
      }
    };
    if (totalSets === 0) {
      Alert.alert('Finalizar sem séries?', 'Nenhuma série foi registrada neste treino.', [
        { text: 'Continuar treinando', style: 'cancel' },
        { text: 'Finalizar', onPress: () => void go() },
      ]);
    } else {
      void go();
    }
  }

  const elapsed = (now - session.startedAt) / 1000;
  const expandedIndex = data?.items.findIndex((i) => i.we.id === expanded) ?? -1;
  const nextItem = data && expandedIndex >= 0 ? data.items[expandedIndex + 1] : undefined;

  return (
    <Screen
      glow="none"
      overlay={pr ? <PrBanner title={pr.title} detail={pr.detail} onDone={() => setPr(null)} /> : null}
      contentStyle={{ gap: 14 }}
    >
      <View style={styles.header}>
        <IconButton icon="chevronDown" label="Minimizar treino" onPress={() => (router.canGoBack() ? router.back() : router.replace('/treinos'))} />
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text style={styles.timer} accessibilityLabel={`Tempo de treino ${clock(elapsed)}`}>{clock(elapsed)}</Text>
          <T variant="caption" numberOfLines={1}>{data?.workout.workoutType || 'Treino'}</T>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={finish}
          disabled={finishing || !data}
          style={({ pressed }) => [styles.finish, (finishing || !data) && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
        >
          {finishing ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Text style={styles.finishText}>Finalizar</Text>}
        </Pressable>
      </View>

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={3} /> : null}

      {data ? (
        <>
          {data.items.length === 0 ? (
            <EmptyState
              icon="dumbbell"
              title="Nenhum exercício ainda"
              message="Escolha os exercícios no catálogo para registrar as séries."
              action="Adicionar exercício"
              onAction={() => router.push({ pathname: '/exercicios', params: { pickFor: 'workout', targetId: String(workoutId) } })}
            />
          ) : null}

          {data.items.map((item) => (
            <ExerciseCard
              key={item.we.id}
              item={item}
              workoutId={workoutId}
              open={expanded === item.we.id}
              onToggle={() => setExpanded((e) => (e === item.we.id ? null : item.we.id))}
              rank={ranks.current[item.we.exerciseId]}
              lpGain={
                ranks.current[item.we.exerciseId] && initialScore.current[item.we.exerciseId] !== undefined
                  ? ranks.current[item.we.exerciseId].rank.score - initialScore.current[item.we.exerciseId]
                  : 0
              }
              target={session.targets[item.we.id]}
              onLog={async (reps, kg) => {
                try {
                  await logSet(item, reps, kg);
                  return true;
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Não foi possível registrar a série.');
                  return false;
                }
              }}
              onEditSet={(set, index) => setEditing({ set, index })}
            />
          ))}

          {rest ? (
            <View style={styles.rest} accessibilityLiveRegion="polite">
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Descanso</Text>
                <Text style={styles.restClock}>{clock(restLeft)}</Text>
              </View>
              <ProgressBar value={(restLeft / rest.total) * 100} height={6} />
              <View style={styles.restButtons}>
                <RestButton label="−15 s" onPress={() => setRest((r) => (r ? { ...r, endsAt: r.endsAt - 15000 } : r))} />
                <RestButton label="+15 s" onPress={() => setRest((r) => (r ? { endsAt: r.endsAt + 15000, total: r.total + 15 } : r))} />
                <RestButton label="Pular" filled onPress={() => setRest(null)} />
              </View>
            </View>
          ) : null}

          {nextItem ? (
            <Pressable accessibilityRole="button" onPress={() => setExpanded(nextItem.we.id)} style={({ pressed }) => [styles.next, pressed && { opacity: 0.8 }]}>
              <Text style={styles.nextLabel}>A SEGUIR</Text>
              <Text style={styles.nextName} numberOfLines={1}>
                {nextItem.we.exerciseName}
                {session.targets[nextItem.we.id]?.sets ? ` · ${session.targets[nextItem.we.id].sets} séries` : ''}
              </Text>
              <Icon name="chevronRight" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}

          {data.items.length > 0 ? (
            <Button
              title="Adicionar exercício"
              icon="plus"
              variant="dashed"
              onPress={() => router.push({ pathname: '/exercicios', params: { pickFor: 'workout', targetId: String(workoutId) } })}
            />
          ) : null}
        </>
      ) : null}

      <SetEditSheet
        set={editing?.set ?? null}
        index={editing?.index}
        onClose={() => setEditing(null)}
        onSaved={(s) => {
          patchSets(s.workoutExerciseId, (sets) => sets.map((x) => (x.id === s.id ? s : x)));
          setEditing(null);
          toast.success('Série atualizada');
        }}
        onDeleted={(setId) => {
          const weId = editing?.set.workoutExerciseId;
          if (weId) patchSets(weId, (sets) => sets.filter((x) => x.id !== setId));
          setEditing(null);
          toast.success('Série excluída');
        }}
      />
    </Screen>
  );
}

function ExerciseCard({
  item,
  workoutId,
  open,
  onToggle,
  rank,
  lpGain,
  target,
  onLog,
  onEditSet,
}: {
  item: Item;
  workoutId: number;
  open: boolean;
  onToggle: () => void;
  rank?: ExerciseRank;
  lpGain: number;
  target?: { sets: number | null; reps: string | null };
  onLog: (reps: number, kg: number | null) => Promise<boolean>;
  onEditSet: (set: WorkoutSet, index: number) => void;
}) {
  const last = item.sets[item.sets.length - 1];
  const [kg, setKg] = useState(last?.weightKg ? formatDecimal(last.weightKg, 2) : '');
  const [reps, setReps] = useState(last ? String(last.reps) : firstReps(target?.reps));
  const [pending, setPending] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // Ao registrar/editar, preenche com a última série.
  const lastId = last?.id;
  useEffect(() => {
    if (last) {
      setKg(last.weightKg ? formatDecimal(last.weightKg, 2) : '');
      setReps(String(last.reps));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId]);

  async function submit() {
    const r = parseNumber(reps);
    const w = parseNumber(kg);
    if (!r || r <= 0 || !Number.isInteger(r)) {
      setInputError('Informe as repetições.');
      return;
    }
    if (w !== undefined && w < 0) {
      setInputError('A carga não pode ser negativa.');
      return;
    }
    setInputError(null);
    setPending(true);
    await onLog(r, w && w > 0 ? w : null);
    setPending(false);
  }

  const best = useMemo(
    () => item.sets.reduce<WorkoutSet | null>((b, s) => ((s.estimatedOneRepMax ?? 0) > (b?.estimatedOneRepMax ?? -1) ? s : b), null),
    [item.sets],
  );
  const info = rank ? RANKS[rank.rank.rank] : null;
  const summary = [
    item.sets.length ? `${item.sets.length} série${item.sets.length > 1 ? 's' : ''}` : target?.sets ? `Meta ${target.sets} × ${target.reps ?? '–'}` : 'Nenhuma série',
    best ? `melhor ${setLabel(best)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.cardHeadMain}>
          {rank ? <RankBadge rank={rank.rank.rank} size={44} /> : (
            <View style={styles.exIcon}>
              <Icon name="dumbbell" size={20} color={colors.textSoft} />
            </View>
          )}
          <View style={{ flex: 1, gap: 5 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.exName} numberOfLines={2}>{item.we.exerciseName}</Text>
              {lpGain > 0 && info ? <Text style={[styles.lpTag, { color: info.color }]}>+{lpGain} LP</Text> : null}
            </View>
            {rank && info ? (
              <>
                <ProgressBar value={rankProgress(rank.rank.rank, rank.rank.lp)} color={info.color} height={6} />
                <T variant="caption" style={{ fontSize: 11 }}>
                  {rankLabel(rank.rank.rank)} · {rank.rank.lp} LP{rank.bodyweightRatio ? ` · ${formatDecimal(rank.bodyweightRatio, 2)}× seu peso` : ''}
                </T>
              </>
            ) : (
              <T variant="caption" style={{ fontSize: 12 }}>{summary}</T>
            )}
          </View>
        </Pressable>
        <IconButton
          icon="more"
          label={`Opções de ${item.we.exerciseName}`}
          size={40}
          onPress={() => router.push({ pathname: '/treinos/exercicio/[id]', params: { id: String(item.we.id), workoutId: String(workoutId) } })}
        />
      </View>

      {open ? (
        <>
          {rank ? <T variant="caption">{summary}</T> : null}
          <View style={styles.tableHead}>
            <Text style={[styles.th, { width: 36, textAlign: 'center' }]}>SÉRIE</Text>
            <Text style={[styles.th, { flex: 1 }]}>1RM EST.</Text>
            <Text style={[styles.th, { width: 64, textAlign: 'center' }]}>KG</Text>
            <Text style={[styles.th, { width: 56, textAlign: 'center' }]}>REPS</Text>
            <View style={{ width: 40 }} />
          </View>

          {item.sets.map((s, i) => {
            const isPr = !!s.personalRecord;
            return (
              <Pressable
                key={s.id}
                onLongPress={() => onEditSet(s, i + 1)}
                delayLongPress={350}
                accessibilityHint="Toque e segure para editar"
                style={[styles.row, { backgroundColor: isPr ? GOLD.bg : DONE_ROW }, isPr && { borderWidth: 1, borderColor: GOLD.border }]}
              >
                <View style={{ width: 36, alignItems: 'center' }}>
                  {isPr ? (
                    <View style={styles.prTag} accessibilityLabel="Recorde pessoal">
                      <Text style={styles.prTagText}>PR</Text>
                    </View>
                  ) : (
                    <Text style={styles.setNum}>{i + 1}</Text>
                  )}
                </View>
                <Text style={styles.prev} numberOfLines={1}>{s.estimatedOneRepMax ? `${formatDecimal(s.estimatedOneRepMax)} kg` : '–'}</Text>
                <View style={[styles.cell, { width: 64 }]}><Text style={styles.cellText}>{s.weightKg ? formatDecimal(s.weightKg) : '–'}</Text></View>
                <View style={[styles.cell, { width: 56 }]}><Text style={styles.cellText}>{s.reps}</Text></View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar série ${i + 1}`}
                  onPress={() => onEditSet(s, i + 1)}
                  style={[styles.check, { backgroundColor: isPr ? GOLD.color : colors.accent, borderWidth: 0 }]}
                >
                  {isPr ? <Icon name="trophy" size={18} color={colors.onAccent} strokeWidth={2.4} /> : <Icon name="check" size={18} color={colors.onAccent} strokeWidth={3} />}
                </Pressable>
              </Pressable>
            );
          })}

          <View style={styles.row}>
            <Text style={[styles.setNum, { width: 36, textAlign: 'center' }]}>{item.sets.length + 1}</Text>
            <Text style={styles.prev} numberOfLines={1}>{last ? setLabel(last).replace(' kg × ', ' × ') : target?.reps ? `meta ${target.reps}` : '–'}</Text>
            <TextInput
              value={kg}
              onChangeText={setKg}
              placeholder="kg"
              placeholderTextColor={colors.textDone}
              keyboardType="decimal-pad"
              selectionColor={colors.accent}
              accessibilityLabel={`Carga da série ${item.sets.length + 1} (kg)`}
              style={[styles.input, { width: 64, borderColor: colors.accent }]}
            />
            <TextInput
              value={reps}
              onChangeText={setReps}
              placeholder="reps"
              placeholderTextColor={colors.textDone}
              keyboardType="number-pad"
              selectionColor={colors.accent}
              accessibilityLabel={`Repetições da série ${item.sets.length + 1}`}
              style={[styles.input, { width: 56 }]}
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Concluir série ${item.sets.length + 1}`}
              onPress={submit}
              disabled={pending}
              style={({ pressed }) => [styles.check, pressed && { backgroundColor: colors.surface2 }]}
            >
              {pending ? <ActivityIndicator color={colors.accent} size="small" /> : <Icon name="check" size={18} color={colors.textMuted} strokeWidth={3} />}
            </Pressable>
          </View>
          {inputError ? <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold }}>{inputError}</T> : null}
          {item.sets.length > 0 ? <T variant="caption" style={{ fontSize: 11 }}>Toque no ✓ ou segure a série para editar ou excluir.</T> : null}
        </>
      ) : null}
    </View>
  );
}

function firstReps(target: string | null | undefined) {
  if (!target) return '';
  const m = target.match(/\d+/);
  return m ? m[0] : '';
}

function RestButton({ label, onPress, filled }: { label: string; onPress: () => void; filled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.restBtn, filled && styles.restBtnFilled, pressed && { opacity: 0.8 }]}>
      <Text style={styles.restBtnText}>{label}</Text>
    </Pressable>
  );
}

// Aviso dourado de recorde pessoal no topo.
function PrBanner({ title, detail, onDone }: { title: string; detail: string; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.delay(2600),
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => doneRef.current());
  }, [anim, title, detail]);
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      style={[
        styles.pr,
        { top: insets.top + 8, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <Icon name="trophy" size={28} color={colors.onAccent} strokeWidth={2} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={styles.prTitle}>{title}</Text>
        <Text style={styles.prDetail}>{detail}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timer: { fontFamily: fonts.title, fontSize: 20, letterSpacing: 0.4, color: colors.text },
  finish: { height: 44, paddingHorizontal: 16, borderRadius: radius.icon, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', minWidth: 92 },
  finishText: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.onAccent },
  card: { gap: 12, padding: 16, borderRadius: radius.cardLg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardHeadMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  exIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  exName: { flex: 1, fontFamily: fonts.extrabold, fontSize: 15, color: colors.text },
  lpTag: { fontFamily: fonts.extrabold, fontSize: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  th: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.6, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 2, borderRadius: 12 },
  setNum: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.text, textAlign: 'center' },
  prTag: { backgroundColor: GOLD.color, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  prTagText: { fontFamily: fonts.extrabold, fontSize: 10, color: colors.onAccent },
  prev: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  cell: { height: 38, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.text },
  input: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface2,
    color: colors.text,
    fontFamily: fonts.extrabold,
    fontSize: 14,
    textAlign: 'center',
    padding: 0,
  },
  check: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rest: { gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  restClock: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
  restButtons: { flexDirection: 'row', gap: 8 },
  restBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, alignItems: 'center', justifyContent: 'center' },
  restBtnFilled: { borderWidth: 0, backgroundColor: colors.surface2 },
  restBtnText: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  next: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border },
  nextLabel: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.9, color: colors.textMuted },
  nextName: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  pr: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: GOLD.color,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  prTitle: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.onAccent },
  prDetail: { fontFamily: fonts.bold, fontSize: 12, color: colors.onAccent },
});
