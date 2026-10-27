import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { routineApi } from '@/api/endpoints';
import type { Routine, RoutineExercise } from '@/api/types';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, EmptyState, ErrorBanner, Field, Header, IconButton, Screen, SkeletonList, T } from '@/components/ui';
import { ExerciseThumb, Stepper } from '@/components/workouts/parts';
import { registerStartedWorkout } from '@/components/workouts/session';
import { useAction, useApi } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';
import { today } from '@/utils/format';

export default function RotinaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routineId = Number(id);
  const toast = useToast();
  const { data, error, loading, refreshing, refresh, reload, setData } = useApi(() => routineApi.get(routineId), [routineId]);

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [busyItem, setBusyItem] = useState<number | null>(null);
  const loadedId = data?.id;
  useEffect(() => {
    if (data) {
      setName(data.name);
      setNotes(data.notes ?? '');
    }
    // Só ao carregar a rotina (não sobrescreve o que está sendo digitado).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedId]);

  const save = useAction(routineApi.update);
  const start = useAction(routineApi.start);
  const [deleting, setDeleting] = useState(false);

  const dirty = !!data && (name.trim() !== data.name || (notes.trim() || null) !== (data.notes || null));

  async function saveInfo() {
    if (!name.trim()) {
      setNameError('A rotina precisa de um nome.');
      return;
    }
    setNameError(undefined);
    const updated = await save.run(routineId, { name: name.trim(), notes: notes.trim() });
    if (updated) {
      setData(updated);
      toast.success('Rotina salva');
    }
  }

  async function runItem(itemId: number, action: () => Promise<Routine>) {
    setBusyItem(itemId);
    try {
      setData(await action());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível alterar a rotina.');
    } finally {
      setBusyItem(null);
    }
  }

  function move(item: RoutineExercise, delta: number) {
    void runItem(item.id, () => routineApi.updateExercise(item.id, { position: item.position + delta }));
  }

  function removeItem(item: RoutineExercise) {
    Alert.alert('Remover exercício?', `${item.exerciseName} sai desta rotina.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => void runItem(item.id, () => routineApi.removeExercise(item.id)),
      },
    ]);
  }

  async function startWorkout() {
    if (dirty) await saveInfo();
    const started = await start.run(routineId, today());
    if (!started) return;
    registerStartedWorkout(started);
    router.replace({ pathname: '/treinos/[id]', params: { id: String(started.workout.id) } });
  }

  function confirmDelete() {
    Alert.alert('Excluir rotina?', 'Os treinos já feitos com ela continuam no histórico.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await routineApi.remove(routineId);
            toast.success('Rotina excluída');
            router.back();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Não foi possível excluir a rotina.');
            setDeleting(false);
          }
        },
      },
    ]);
  }

  const exercises = data?.exercises ?? [];

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      footer={
        data ? (
          <Button
            title="Iniciar treino"
            icon="play"
            onPress={startWorkout}
            loading={start.pending}
            disabled={exercises.length === 0}
          />
        ) : null
      }
    >
      <Header
        title="Rotina"
        right={<IconButton icon="trash" label="Excluir rotina" color={colors.danger} onPress={confirmDelete} style={deleting ? { opacity: 0.5 } : null} />}
      />

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={4} /> : null}

      {data ? (
        <>
          <Field label="Nome" value={name} onChangeText={setName} error={nameError} maxLength={80} />
          <Field label="Observações" value={notes} onChangeText={setNotes} placeholder="Opcional" multiline maxLength={300} />
          {save.error ? <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold }}>{save.error}</T> : null}
          {dirty ? <Button title="Salvar alterações" variant="secondary" small onPress={saveInfo} loading={save.pending} /> : null}
          {start.error ? <ErrorBanner title="Não foi possível iniciar" message={start.error} /> : null}

          <View style={styles.sectionHead}>
            <T variant="section">Exercícios</T>
            <T variant="caption">{exercises.length} no total</T>
          </View>

          {exercises.length === 0 ? (
            <EmptyState
              icon="dumbbell"
              title="Nenhum exercício ainda"
              message="Adicione exercícios do catálogo com séries, repetições e descanso."
            />
          ) : (
            exercises.map((item, i) => (
              <RoutineItem
                key={item.id}
                item={item}
                index={i}
                isFirst={i === 0}
                isLast={i === exercises.length - 1}
                busy={busyItem === item.id}
                editing={editingItem === item.id}
                onToggleEdit={() => setEditingItem((e) => (e === item.id ? null : item.id))}
                onMove={(d) => move(item, d)}
                onRemove={() => removeItem(item)}
                onSave={async (values) => {
                  await runItem(item.id, () => routineApi.updateExercise(item.id, values));
                  setEditingItem(null);
                }}
              />
            ))
          )}

          <Button
            title="Adicionar exercício"
            icon="plus"
            variant="dashed"
            onPress={() => router.push({ pathname: '/exercicios', params: { pickFor: 'routine', targetId: String(routineId) } })}
          />
        </>
      ) : null}
    </Screen>
  );
}

function RoutineItem({
  item,
  index,
  isFirst,
  isLast,
  busy,
  editing,
  onToggleEdit,
  onMove,
  onRemove,
  onSave,
}: {
  item: RoutineExercise;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  editing: boolean;
  onToggleEdit: () => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  onSave: (v: { targetSets: number; targetReps: string; restSeconds: number }) => Promise<void>;
}) {
  const [sets, setSets] = useState(item.targetSets ?? 3);
  const [reps, setReps] = useState(item.targetReps ?? '8-12');
  const [rest, setRest] = useState(item.restSeconds ?? 90);
  const [repsError, setRepsError] = useState<string>();

  useEffect(() => {
    if (editing) {
      setSets(item.targetSets ?? 3);
      setReps(item.targetReps ?? '8-12');
      setRest(item.restSeconds ?? 90);
      setRepsError(undefined);
    }
  }, [editing, item]);

  function submit() {
    if (!/^\d{1,3}(\s*-\s*\d{1,3})?$/.test(reps.trim())) {
      setRepsError('Use um número ou faixa, ex: 10 ou 8-12.');
      return;
    }
    void onSave({ targetSets: sets, targetReps: reps.replace(/\s/g, ''), restSeconds: rest });
  }

  const target = `${item.targetSets ?? '–'} × ${item.targetReps ?? '–'}`;
  return (
    <View style={[styles.item, busy && { opacity: 0.6 }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: editing }} onPress={onToggleEdit} style={styles.itemHead}>
        <Text style={styles.position}>{index + 1}</Text>
        <ExerciseThumb uri={item.imageUrl} size={48} />
        <View style={{ flex: 1, gap: 3 }}>
          <T style={{ fontFamily: fonts.bold, fontSize: 14 }} numberOfLines={2}>{item.exerciseName}</T>
          <T variant="caption">
            {target}
            {item.restSeconds ? ` · ${item.restSeconds} s descanso` : ''}
            {item.muscleGroup ? ` · ${item.muscleGroup}` : ''}
          </T>
        </View>
        <Icon name="edit" size={18} color={editing ? colors.accent : colors.textMuted} />
      </Pressable>

      {editing ? (
        <View style={{ gap: 10 }}>
          <Stepper label="Séries" value={String(sets)} onMinus={() => setSets((n) => Math.max(1, n - 1))} onPlus={() => setSets((n) => Math.min(20, n + 1))} />
          <Field label="Repetições" value={reps} onChangeText={setReps} error={repsError} placeholder="8-12" keyboardType="numbers-and-punctuation" maxLength={9} />
          <Stepper label="Descanso (s)" value={String(rest)} onMinus={() => setRest((n) => Math.max(0, n - 15))} onPlus={() => setRest((n) => Math.min(600, n + 15))} />
          <View style={styles.actions}>
            <IconButton icon="trash" label="Remover da rotina" color={colors.danger} onPress={onRemove} />
            <View style={{ flex: 1 }} />
            <Button title="Salvar" small onPress={submit} loading={busy} style={{ paddingHorizontal: 22 }} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <IconButton icon="chevronDown" label="Mover para cima" onPress={isFirst ? undefined : () => onMove(-1)} style={[styles.up, isFirst && styles.disabled]} size={40} />
          <IconButton icon="chevronDown" label="Mover para baixo" onPress={isLast ? undefined : () => onMove(1)} style={isLast ? styles.disabled : null} size={40} />
          <View style={{ flex: 1 }} />
          <IconButton icon="close" label="Remover da rotina" color={colors.textMuted} onPress={onRemove} size={40} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  item: { gap: 12, padding: 14, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  position: { width: 18, fontFamily: fonts.title, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  up: { transform: [{ rotate: '180deg' }] },
  disabled: { opacity: 0.3 },
});
