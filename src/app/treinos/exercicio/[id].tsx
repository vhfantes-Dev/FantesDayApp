import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { workoutApi } from '@/api/endpoints';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/api/types';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, Card, EmptyState, ErrorBanner, Header, Screen, SkeletonList, T } from '@/components/ui';
import { DONE_ROW, GOLD, SetEditSheet, setLabel, volumeOf } from '@/components/workouts/parts';
import { useApi } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';
import { formatDecimal, formatNumber } from '@/utils/format';

interface EditData {
  workout: Workout | null;
  item: WorkoutExercise;
  sets: WorkoutSet[];
}

export default function EditarExercicioTreinoScreen() {
  const { id, workoutId } = useLocalSearchParams<{ id: string; workoutId?: string }>();
  const itemId = Number(id);
  const wId = workoutId ? Number(workoutId) : null;
  const toast = useToast();
  const [editing, setEditing] = useState<{ set: WorkoutSet; index: number } | null>(null);
  const [removing, setRemoving] = useState(false);

  const { data, error, loading, reload, setData } = useApi<EditData>(async () => {
    const [sets, exercises, workout] = await Promise.all([
      workoutApi.sets(itemId),
      wId ? workoutApi.exercises(wId) : Promise.resolve<WorkoutExercise[]>([]),
      wId ? workoutApi.get(wId).catch(() => null) : Promise.resolve(null),
    ]);
    const item = exercises.find((e) => e.id === itemId) ?? {
      id: itemId,
      workoutId: wId ?? 0,
      exerciseId: sets[0]?.exerciseId ?? 0,
      exerciseName: sets[0]?.exerciseName ?? 'Exercício',
    };
    return { workout, item, sets };
  }, [itemId, wId]);

  function confirmRemove() {
    Alert.alert('Remover exercício?', 'O exercício e todas as séries registradas nele saem deste treino.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setRemoving(true);
          try {
            await workoutApi.removeExercise(itemId);
            toast.success('Exercício removido do treino');
            router.back();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Não foi possível remover o exercício.');
            setRemoving(false);
          }
        },
      },
    ]);
  }

  const sets = data?.sets ?? [];
  const volume = volumeOf(sets);

  return (
    <Screen
      footer={
        data ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Remover" variant="danger" onPress={confirmRemove} loading={removing} style={{ flex: 1, height: 54 }} />
            <Button title="Concluído" onPress={() => router.back()} style={{ flex: 1, height: 54 }} />
          </View>
        ) : null
      }
    >
      <Header title="Editar exercício" />

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={3} /> : null}

      {data ? (
        <>
          <View style={{ gap: 4 }}>
            <Text style={styles.name}>{data.item.exerciseName}</Text>
            {data.workout ? <T variant="caption" style={{ fontSize: 13 }}>{data.workout.workoutType || 'Treino'}</T> : null}
          </View>

          <Card style={styles.swap} onPress={() => router.push({ pathname: '/exercicios', params: { pickFor: 'swap', targetId: String(itemId) } })}>
            <View style={styles.swapIcon}>
              <Icon name="dumbbell" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T style={{ fontFamily: fonts.bold }}>Trocar exercício</T>
              <T variant="caption">Escolha outro no catálogo; as séries continuam aqui.</T>
            </View>
            <Icon name="chevronRight" size={18} color={colors.textMuted} />
          </Card>

          {data.item.exerciseId ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/exercicios/[id]', params: { id: String(data.item.exerciseId) } })}
              style={{ paddingVertical: 6, alignSelf: 'flex-start' }}
              hitSlop={8}
            >
              <Text style={styles.link}>Ver detalhes e evolução do exercício</Text>
            </Pressable>
          ) : null}

          <View style={{ gap: 10 }}>
            <T variant="section">Séries</T>
            {sets.length === 0 ? (
              <EmptyState icon="dumbbell" title="Nenhuma série registrada" message="Registre as séries na tela do treino." />
            ) : (
              sets.map((s, i) => (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar série ${i + 1}: ${setLabel(s)}`}
                  onPress={() => setEditing({ set: s, index: i + 1 })}
                  style={({ pressed }) => [
                    styles.setRow,
                    { backgroundColor: s.personalRecord ? GOLD.bg : DONE_ROW },
                    s.personalRecord && { borderColor: GOLD.border },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={[styles.setNum, s.personalRecord && { backgroundColor: GOLD.color }]}>
                    {s.personalRecord ? (
                      <Icon name="trophy" size={16} color={colors.onAccent} strokeWidth={2.4} />
                    ) : (
                      <Text style={styles.setNumText}>{i + 1}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ fontFamily: fonts.bold }}>{setLabel(s)}</T>
                    <T variant="caption">
                      {s.estimatedOneRepMax ? `1RM estimado ${formatDecimal(s.estimatedOneRepMax)} kg` : '1RM não estimado'}
                      {s.personalRecord ? ' · Recorde' : ''}
                    </T>
                  </View>
                  <Icon name="edit" size={18} color={colors.textMuted} />
                </Pressable>
              ))
            )}
            {sets.length > 0 ? (
              <T variant="caption">
                {sets.length} {sets.length === 1 ? 'série' : 'séries'} · volume {formatNumber(volume)} kg
              </T>
            ) : null}
          </View>
        </>
      ) : null}

      <SetEditSheet
        set={editing?.set ?? null}
        index={editing?.index}
        onClose={() => setEditing(null)}
        onSaved={(s) => {
          setData((d) => (d ? { ...d, sets: d.sets.map((x) => (x.id === s.id ? s : x)) } : d!));
          setEditing(null);
          toast.success('Série atualizada');
        }}
        onDeleted={(setId) => {
          setData((d) => (d ? { ...d, sets: d.sets.filter((x) => x.id !== setId) } : d!));
          setEditing(null);
          toast.success('Série excluída');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
  swap: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  swapIcon: { width: 44, height: 44, borderRadius: radius.icon, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 56,
  },
  setNum: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  setNumText: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.text },
});
