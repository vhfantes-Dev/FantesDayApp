import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { routineApi, workoutApi } from '@/api/endpoints';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, EmptyState, ErrorBanner, IconButton, Screen, SkeletonList } from '@/components/ui';
import { ACCENT_BORDER } from '@/components/workouts/parts';
import { RoutineCard } from '@/components/workouts/RoutineParts';
import { nextRoutine, routineMeta } from '@/components/workouts/routines';
import { registerStartedWorkout } from '@/components/workouts/session';
import { useApi } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';
import { today } from '@/utils/format';

export default function RotinasScreen() {
  const userId = useUserId();
  const toast = useToast();
  const [starting, setStarting] = useState(false);

  const { data, error, loading, refreshing, refresh, reload } = useApi(async () => {
    const [routines, workouts] = await Promise.all([routineApi.list(userId), workoutApi.list(userId).catch(() => [])]);
    return { routines, workouts };
  }, [userId]);

  const next = data ? nextRoutine(data.routines, data.workouts) : null;
  const metas = data?.routines.map((r, i) => routineMeta(r, i)) ?? [];
  const nextIndex = next && data ? data.routines.indexOf(next) : -1;
  const nextMeta = nextIndex >= 0 ? metas[nextIndex] : null;
  const goal = metas.find((m) => m.goal)?.goal;
  const overline = data
    ? [`${data.routines.length} ${data.routines.length === 1 ? 'ROTINA' : 'ROTINAS'}`, goal?.toUpperCase(), goal ? `${data.routines.length}× POR SEMANA` : null]
        .filter(Boolean)
        .join(' · ')
    : '';

  async function start() {
    if (!next?.id) return;
    setStarting(true);
    try {
      const started = await routineApi.start(next.id, today());
      registerStartedWorkout(started);
      router.push({ pathname: '/treinos/[id]', params: { id: String(started.workout.id) } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível iniciar o treino.');
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      contentStyle={{ gap: 14 }}
      footer={
        next && nextMeta ? (
          <Button
            title={`Iniciar Treino ${nextMeta.letter} · ${nextMeta.title}`}
            icon="play"
            onPress={start}
            loading={starting}
            style={{ height: 60, borderRadius: 20 }}
          />
        ) : null
      }
    >
      <View style={styles.header}>
        <IconButton icon="back" label="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/treinos'))} />
        <Text style={styles.title}>Minhas rotinas</Text>
        <IconButton icon="plus" label="Criar rotina manual" onPress={() => router.push({ pathname: '/treinos/novo', params: { modo: 'rotina' } })} />
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/rotinas/gerar')} style={({ pressed }) => [styles.generate, pressed && { opacity: 0.85 }]}>
        <View style={styles.genIcon}>
          <Icon name="sparkles" size={24} color={colors.onAccent} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.genTitle}>Gerar rotina automática</Text>
          <Text style={styles.genSub}>Pelo seu objetivo, dias por semana, nível e equipamentos</Text>
        </View>
        <Icon name="chevronRight" size={18} color={colors.accent} strokeWidth={2.4} />
      </Pressable>

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={3} /> : null}

      {data ? (
        data.routines.length === 0 ? (
          <EmptyState
            icon="dumbbell"
            title="Nenhuma rotina ainda"
            message="Gere rotinas automaticamente ou monte a sua do zero."
            action="Criar rotina manual"
            onAction={() => router.push({ pathname: '/treinos/novo', params: { modo: 'rotina' } })}
          />
        ) : (
          <>
            <Text style={styles.overline}>{overline}</Text>
            {data.routines.map((r, i) => (
              <RoutineCard
                key={r.id ?? i}
                routine={r}
                meta={metas[i]}
                isNext={r === next}
                showExercises={r === next}
                onPress={() => r.id && router.push({ pathname: '/rotinas/[id]', params: { id: String(r.id) } })}
              />
            ))}
          </>
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.title, fontSize: 16, color: colors.text },
  generate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: ACCENT_BORDER,
  },
  genIcon: { width: 44, height: 44, borderRadius: radius.icon, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  genTitle: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.text },
  genSub: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textLabel },
  overline: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1, color: colors.textMuted },
});
