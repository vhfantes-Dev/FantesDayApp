import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { routineApi, strengthApi, workoutApi } from '@/api/endpoints';
import type { Routine, Streak, StrengthProfile, Workout } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import {
  Card,
  EmptyState,
  ErrorBanner,
  Fab,
  IconButton,
  PageTitle,
  ProgressBar,
  RankBadge,
  Screen,
  Section,
  SkeletonList,
  T,
} from '@/components/ui';
import { sortWorkouts } from '@/components/workouts/labels';
import { registerStartedWorkout } from '@/components/workouts/session';
import { nextRoutine, routineMeta } from '@/components/workouts/routines';
import { ShortcutTile, STREAK, StreakPill, WorkoutRow } from '@/components/workouts/parts';
import { useApi } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';
import { addDays, parseIsoDate, relativeDate, shortDate, today, weekdayShort, WEEK_CODES } from '@/utils/format';
import { RANK_ORDER, RANKS, rankProgress } from '@/utils/ranks';

interface TreinosData {
  routines: Routine[];
  workouts: Workout[];
  streak: Streak | null;
  profile: StrengthProfile | null;
}

export default function TreinosScreen() {
  const userId = useUserId();
  const toast = useToast();
  const [starting, setStarting] = useState<number | null>(null);

  const { data, error, loading, refreshing, refresh, reload } = useApi<TreinosData>(async () => {
    // Rotinas e treinos são essenciais; sequência e rank podem falhar sem derrubar a tela.
    const [routines, workouts, streak, profile] = await Promise.all([
      routineApi.list(userId),
      workoutApi.list(userId),
      strengthApi.streak(userId).catch(() => null),
      strengthApi.profile(userId).catch(() => null),
    ]);
    return { routines, workouts: sortWorkouts(workouts), streak, profile };
  }, [userId]);

  async function startRoutine(routine: Routine) {
    if (!routine.id) return;
    if (!routine.exercises.length) {
      toast.error('Adicione exercícios à rotina antes de iniciar.');
      router.push({ pathname: '/rotinas/[id]', params: { id: String(routine.id) } });
      return;
    }
    setStarting(routine.id);
    try {
      const started = await routineApi.start(routine.id, today());
      registerStartedWorkout(started);
      router.push({ pathname: '/treinos/[id]', params: { id: String(started.workout.id) } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível iniciar o treino.');
    } finally {
      setStarting(null);
    }
  }

  const next = data ? nextRoutine(data.routines, data.workouts) : null;
  const todayWorkout = data?.workouts.find((w) => w.date === today());

  return (
    <Screen
      withTabBar
      refreshing={refreshing}
      onRefresh={refresh}
      overlay={<Fab title="Novo treino" onPress={() => router.push('/treinos/novo')} />}
    >
      <PageTitle
        title="Treinos"
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {data?.streak ? (
              <StreakPill days={data.streak.currentStreakDays} active={data.streak.active} onPress={() => router.push('/celebracao/sequencia')} />
            ) : null}
            <IconButton icon="podium" label="Ranking" onPress={() => router.push('/ranking')} />
          </View>
        }
      />

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={4} /> : null}

      {data ? (
        <>
          <RankCard profile={data.profile} />

          {data.streak ? <WeekStrip streak={data.streak} workouts={data.workouts} /> : null}

          {next ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Começar treino ${next.name}`}
              onPress={() => startRoutine(next)}
              disabled={starting !== null}
              style={({ pressed }) => [styles.start, pressed && { opacity: 0.9 }]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.startTitle}>Começar treino</Text>
                <Text style={styles.startSub} numberOfLines={1}>{startSubtitle(next, data.routines)}</Text>
              </View>
              <View style={styles.startIcon}>
                {starting === next.id ? <ActivityIndicator color={colors.accent} /> : <Icon name="play" size={18} color={colors.accent} fill={colors.accent} />}
              </View>
            </Pressable>
          ) : null}

          {todayWorkout ? (
            <Card onPress={() => router.push({ pathname: '/treinos/[id]', params: { id: String(todayWorkout.id) } })} style={styles.resume}>
              <Icon name="dumbbell" size={22} color={colors.accent} />
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontFamily: fonts.bold }} numberOfLines={1}>{todayWorkout.workoutType || 'Treino'}</T>
                <T variant="caption">Treino de hoje · toque para continuar registrando</T>
              </View>
              <Icon name="chevronRight" size={18} color={colors.textMuted} />
            </Card>
          ) : null}

          <Section title="Minhas rotinas" action={data.routines.length ? 'Ver todas' : 'Nova rotina'} onAction={() => (data.routines.length ? router.push('/rotinas') : router.push({ pathname: '/treinos/novo', params: { modo: 'rotina' } }))}>
            {data.routines.length === 0 ? (
              <EmptyState
                icon="dumbbell"
                title="Nenhuma rotina ainda"
                message="Gere rotinas pelo seu objetivo ou monte a sua do zero."
                action="Gerar rotinas"
                onAction={() => router.push('/rotinas/gerar')}
              />
            ) : (
              <View style={{ gap: 10 }}>
                {data.routines.map((r) => (
                  <RoutineCard key={r.id ?? r.name} routine={r} starting={starting === r.id} disabled={starting !== null} onStart={() => startRoutine(r)} />
                ))}
              </View>
            )}
          </Section>

          {data.profile && data.profile.muscles.length > 0 ? (
            <View style={{ gap: 10 }}>
              <View style={styles.sectionHead}>
                <T variant="section" style={{ fontSize: 15 }}>Músculos</T>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <Pressable accessibilityRole="button" onPress={() => router.push('/rank/mapa')} hitSlop={8} style={{ paddingVertical: 6 }}>
                    <Text style={[styles.link, { color: colors.carbs }]}>Recuperação</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => router.push('/rank/exercicios')} hitSlop={8} style={{ paddingVertical: 6 }}>
                    <Text style={styles.link}>Ver ranks</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.muscleGrid}>
                {[...data.profile.muscles]
                  .sort((a, b) => b.rank.score - a.rank.score)
                  .slice(0, 3)
                  .map((m) => (
                    <View key={m.muscleGroup} style={styles.muscle}>
                      <RankBadge rank={m.rank.rank} size={29} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.muscleName} numberOfLines={1}>{m.muscleGroup}</Text>
                        <T variant="caption" style={{ fontSize: 11 }}>{m.rank.score}</T>
                      </View>
                    </View>
                  ))}
              </View>
            </View>
          ) : null}

          <Section title="Treinos recentes" action={data.workouts.length ? 'Ver histórico' : undefined} onAction={() => router.push('/treinos/historico')}>
            {data.workouts.length === 0 ? (
              <EmptyState icon="history" title="Nenhum treino registrado" message="Comece uma rotina ou um treino livre para ganhar XP." />
            ) : (
              <View style={{ gap: 10 }}>
                {data.workouts.slice(0, 3).map((w) => (
                  <WorkoutRow
                    key={w.id}
                    workout={w}
                    subtitle={relativeDate(w.date)}
                    onPress={() => router.push({ pathname: '/treinos/resumo/[id]', params: { id: String(w.id) } })}
                  />
                ))}
              </View>
            )}
          </Section>

          <View style={styles.shortcuts}>
            <ShortcutTile label="Histórico" onPress={() => router.push('/treinos/historico')} />
            <ShortcutTile label="Atividades" onPress={() => router.push('/atividades')} />
            <ShortcutTile label="Rotinas" accent onPress={() => router.push('/rotinas')} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

// "Treino A · Push · 5 exercícios"
function startSubtitle(routine: Routine, all: Routine[]) {
  const meta = routineMeta(routine, Math.max(0, all.indexOf(routine)));
  const label = /^Treino\s+[A-Z]/i.test(routine.name) ? `Treino ${meta.letter} · ${meta.title}` : routine.name;
  return `${label} · ${meta.exercises} ${meta.exercises === 1 ? 'exercício' : 'exercícios'}`;
}

function RankCard({ profile }: { profile: StrengthProfile | null }) {
  const overall = profile?.overall;
  if (!overall) {
    return (
      <Card onPress={() => router.push('/rank')} style={styles.rankCard}>
        <RankBadge rank={null} size={64} locked />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.overline}>RANK DE FORÇA</Text>
          <T style={{ fontFamily: fonts.bold }}>Sem rank ainda</T>
          <T variant="caption">
            {profile && (!profile.bodyweightKg || !profile.sex)
              ? 'Informe peso e sexo no perfil e registre séries em exercícios com rank.'
              : 'Registre séries em exercícios com rank para receber sua nota.'}
          </T>
        </View>
      </Card>
    );
  }
  const info = RANKS[overall.rank];
  const idx = RANK_ORDER.indexOf(overall.rank);
  const nextRank = overall.nextRank ?? RANK_ORDER[idx + 1];
  const span = overall.rank === 'OLYMPIAN' ? 200 : 100;
  return (
    <Card onPress={() => router.push('/rank')} style={styles.rankCard}>
      <View pointerEvents="none" style={[styles.rankGlow, { backgroundColor: info.color }]} />
      <RankBadge rank={overall.rank} size={79} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.overline}>RANK DE FORÇA</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={[styles.rankName, { color: info.color }]}>{info.label}</Text>
          <Text style={styles.rankScore}>{overall.score} / 1000</Text>
        </View>
        <ProgressBar value={rankProgress(overall.rank, overall.lp)} color={info.color} />
        <T variant="caption">
          {overall.lp} LP{nextRank ? ` · faltam ${Math.max(0, span - overall.lp)} para ${RANKS[nextRank].label}` : ' · rank máximo'}
        </T>
      </View>
    </Card>
  );
}

// Semana de segunda a domingo com os dias treinados.
function WeekStrip({ streak, workouts }: { streak: Streak; workouts: Workout[] }) {
  const t = today();
  const dow = (parseIsoDate(t).getDay() + 6) % 7; // 0 = segunda
  const monday = addDays(t, -dow);
  const trained = new Set(workouts.map((w) => w.date));
  const days = WEEK_CODES.map((code, i) => ({ code, date: addDays(monday, i) }));
  // A sequência conta dias corridos até o último treino.
  const streakStart = addDays(streak.lastWorkoutDate ?? t, -(streak.currentStreakDays - 1));
  return (
    <View style={styles.week}>
      <View style={styles.sectionHead}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.text }}>Esta semana</Text>
        <T variant="caption">
          {streak.active && streak.expiresOn ? `Treine até ${weekdayShort(streak.expiresOn).toLowerCase()}, ${shortDate(streak.expiresOn)} para manter` : 'Treine para começar uma sequência'}
        </T>
      </View>
      <View style={styles.weekRow}>
        {days.map((d) => {
          const isToday = d.date === t;
          const done = trained.has(d.date);
          // Descanso que conta: dia passado sem treino dentro da sequência ativa.
          const rest = !done && d.date < t && streak.active && streak.currentStreakDays > 0 && d.date >= streakStart;
          return (
            <View key={d.code} style={styles.weekDay} accessibilityLabel={`${d.code}: ${done ? 'treinou' : rest ? 'descanso' : 'sem treino'}`}>
              <Text style={[styles.weekCode, isToday && { color: STREAK.text, fontFamily: fonts.extrabold }]}>{d.code === 'SAB' ? 'SÁB' : d.code}</Text>
              <View
                style={[
                  styles.dot,
                  done
                    ? { backgroundColor: STREAK.flame, borderWidth: 0 }
                    : rest
                      ? { borderStyle: 'dashed', borderColor: STREAK.border }
                      : null,
                  isToday && done && styles.dotToday,
                  isToday && !done && { borderColor: STREAK.flame },
                ]}
              >
                {done ? <Icon name="check" size={16} color={colors.onAccent} strokeWidth={3} /> : null}
              </View>
            </View>
          );
        })}
      </View>
      <T variant="caption" style={{ fontSize: 11 }}>Tracejado = descanso que conta · 3 dias sem treinar quebram a sequência</T>
    </View>
  );
}

function RoutineCard({ routine, onStart, starting, disabled }: { routine: Routine; onStart: () => void; starting: boolean; disabled: boolean }) {
  const muscles = Array.from(new Set(routine.exercises.map((e) => e.muscleGroup).filter(Boolean))).slice(0, 3).join(', ');
  const count = routine.exercises.length;
  return (
    <Card onPress={() => routine.id && router.push({ pathname: '/rotinas/[id]', params: { id: String(routine.id) } })} style={styles.routine}>
      <View style={{ flex: 1, gap: 4 }}>
        <T style={{ fontFamily: fonts.bold }} numberOfLines={1}>{routine.name}</T>
        <T variant="caption" numberOfLines={1}>
          {count ? `${count} exercício${count > 1 ? 's' : ''}${muscles ? ` · ${muscles}` : ''}` : 'Sem exercícios'}
        </T>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Iniciar ${routine.name}`}
        onPress={onStart}
        disabled={disabled}
        style={({ pressed }) => [styles.startSmall, disabled && !starting && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
      >
        {starting ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Text style={styles.startSmallText}>Iniciar</Text>}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rankCard: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: radius.cardLg, overflow: 'hidden' },
  rankGlow: { position: 'absolute', left: 10, top: 10, width: 90, height: 90, borderRadius: 45, opacity: 0.18 },
  overline: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1.1, color: colors.textMuted },
  rankName: { fontFamily: fonts.display, fontSize: 22 },
  rankScore: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSoft },
  week: { gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { flex: 1, alignItems: 'center', gap: 6 },
  weekCode: { fontFamily: fonts.bold, fontSize: 10, color: colors.textMuted },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dotToday: { borderWidth: 2, borderColor: STREAK.flame, transform: [{ scale: 1.08 }] },
  start: {
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 12,
  },
  startTitle: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.onAccent },
  startSub: { fontFamily: fonts.bold, fontSize: 12, color: colors.onAccent, opacity: 0.75 },
  startIcon: { width: 44, height: 44, borderRadius: radius.icon, backgroundColor: colors.onAccent, alignItems: 'center', justifyContent: 'center' },
  resume: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  muscleGrid: { flexDirection: 'row', gap: 8 },
  muscle: {
    flex: 1,
    padding: 10,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muscleName: { fontFamily: fonts.bold, fontSize: 12, color: colors.text },
  routine: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  startSmall: { height: 44, minWidth: 84, paddingHorizontal: 16, borderRadius: radius.icon, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  startSmallText: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.onAccent },
  shortcuts: { flexDirection: 'row', gap: 8, marginBottom: 60 },
});
