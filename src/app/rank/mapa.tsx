import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { exerciseApi, workoutApi } from '@/api/endpoints';
import type { Exercise } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { BodyMap, RECOVERY_COLORS, recoveryStatus } from '@/components/rank/BodyMap';
import { Card, EmptyState, ErrorBanner, IconButton, ProgressBar, Screen, SkeletonList, T } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { addDays, parseIsoDate, today } from '@/utils/format';

// Horas até um grupo muscular ficar 100% recuperado.
const FULL_RECOVERY_HOURS = 72;
const MAX_WORKOUTS = 14;
const MAX_EXERCISES = 40;

// Cache dos exercícios do catálogo (não mudam durante o uso do app).
const exerciseCache = new Map<number, Promise<Exercise>>();
function getExercise(id: number) {
  let p = exerciseCache.get(id);
  if (!p) {
    p = exerciseApi.get(id);
    p.catch(() => exerciseCache.delete(id));
    exerciseCache.set(id, p);
  }
  return p;
}

interface MuscleRecovery {
  group: string;
  pct: number;
  hoursLeft: number;
  lastDate: string;
}

// Treinos só têm data; consideramos que aconteceram ao meio-dia.
function hoursSince(iso: string) {
  const d = parseIsoDate(iso);
  d.setHours(12, 0, 0, 0);
  return Math.max(0, (Date.now() - d.getTime()) / 3_600_000);
}

async function loadRecovery(userId: number): Promise<MuscleRecovery[]> {
  const t = today();
  const from = addDays(t, -7);
  const workouts = await workoutApi.list(userId);
  const recent = workouts
    .filter((w) => w.date >= from && w.date <= t)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, MAX_WORKOUTS);

  const lists = await Promise.all(recent.map((w) => workoutApi.exercises(w.id).then((items) => ({ date: w.date, items }))));
  const lastByExercise = new Map<number, string>();
  for (const { date, items } of lists) {
    for (const it of items) {
      const prev = lastByExercise.get(it.exerciseId);
      if (!prev || date > prev) lastByExercise.set(it.exerciseId, date);
    }
  }

  const ids = [...lastByExercise.keys()].slice(0, MAX_EXERCISES);
  const exercises = await Promise.all(ids.map((id) => getExercise(id).catch(() => null)));

  const lastByGroup = new Map<string, string>();
  exercises.forEach((ex) => {
    if (!ex?.muscleGroup) return;
    const date = lastByExercise.get(ex.id)!;
    const prev = lastByGroup.get(ex.muscleGroup);
    if (!prev || date > prev) lastByGroup.set(ex.muscleGroup, date);
  });

  return [...lastByGroup.entries()]
    .map(([group, lastDate]) => {
      const h = hoursSince(lastDate);
      return {
        group,
        lastDate,
        pct: Math.min(100, Math.round((h / FULL_RECOVERY_HOURS) * 100)),
        hoursLeft: Math.max(0, Math.round(FULL_RECOVERY_HOURS - h)),
      };
    })
    .sort((a, b) => a.pct - b.pct);
}

const MAIN_GROUPS = ['Peito', 'Costas', 'Ombros', 'Quadríceps', 'Posteriores de coxa', 'Glúteos', 'Bíceps', 'Tríceps', 'Abdômen'];

export default function MapaMuscularScreen() {
  const userId = useUserId();
  const { width } = useWindowDimensions();
  const bodyWidth = Math.min(150, Math.floor((width - 40 - 20 - 24) / 2));
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => loadRecovery(userId), [userId]);

  const recovery: Record<string, number> = {};
  data?.forEach((m) => (recovery[m.group] = m.pct));

  const resting = (data ?? []).filter((m) => m.pct < 100).map((m) => m.group);
  const ready = MAIN_GROUPS.filter((g) => (recovery[g] ?? 100) >= 100);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <IconButton icon="back" label="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/rank'))} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>Recuperação muscular</Text>
          <T variant="caption">Com base nos treinos dos últimos 7 dias</T>
        </View>
      </View>

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={4} /> : null}

      {data ? (
        <>
          <BodyMap recovery={recovery} width={bodyWidth} />

          {ready.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/treinos/novo')}
              style={({ pressed }) => [styles.suggest, pressed && { opacity: 0.85 }]}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.suggestOver}>{resting.length ? 'TREINE ENQUANTO DESCANSA' : 'TUDO RECUPERADO'}</Text>
                <Text style={styles.suggestTitle}>{ready.slice(0, 2).join(' + ')}</Text>
                <T variant="caption" color={colors.textLabel}>
                  {resting.length
                    ? `Prontos para treinar · ${joinPt(resting.slice(0, 3).map((g) => g.toLowerCase()))} ${resting.length > 1 ? 'seguem' : 'segue'} em descanso`
                    : 'Todos os grupos estão prontos para um treino pesado'}
                </T>
              </View>
              <View style={styles.play}>
                <Icon name="play" size={18} color={colors.onAccent} fill={colors.onAccent} />
              </View>
            </Pressable>
          ) : null}

          {data.length === 0 ? (
            <EmptyState
              icon="body"
              title="Nenhum treino nos últimos 7 dias"
              message="Todos os músculos estão prontos. Registre um treino para acompanhar a recuperação."
              action="Começar treino"
              onAction={() => router.push('/treinos/novo')}
            />
          ) : (
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {data.map((m, i) => {
                const status = recoveryStatus(m.pct);
                const color = RECOVERY_COLORS[status];
                return (
                  <View
                    key={m.group}
                    style={[styles.row, i < data.length - 1 && styles.rowBorder]}
                    accessibilityLabel={`${m.group}: ${status === 'ready' ? 'pronto' : `${m.pct}% recuperado, cerca de ${m.hoursLeft} horas`}`}
                  >
                    <Text style={styles.group} numberOfLines={1}>{m.group}</Text>
                    <View style={{ flex: 1 }}>
                      <ProgressBar value={m.pct} color={color} height={6} />
                    </View>
                    {status === 'ready' ? (
                      <Text style={[styles.value, { color: colors.accent, fontFamily: fonts.bold }]}>Pronto</Text>
                    ) : (
                      <Text style={styles.value}>{m.pct}% · ~{m.hoursLeft} h</Text>
                    )}
                  </View>
                );
              })}
            </Card>
          )}

          <T variant="caption" style={{ textAlign: 'center' }}>
            Estimativa: cada grupo leva cerca de {FULL_RECOVERY_HOURS} h para se recuperar após o treino.
          </T>
        </>
      ) : null}
    </Screen>
  );
}

function joinPt(items: string[]) {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontFamily: fonts.title, fontSize: 19, color: colors.text },
  suggest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    paddingLeft: 16,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentSoftBorder,
  },
  suggestOver: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.9, color: colors.accent },
  suggestTitle: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.text },
  play: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  group: { width: 84, fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  value: { width: 96, textAlign: 'right', fontFamily: fonts.medium, fontSize: 12, color: colors.textSoft },
});
