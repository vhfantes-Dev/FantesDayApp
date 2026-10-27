import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { routineApi } from '@/api/endpoints';
import type { Routine, RoutineExercise } from '@/api/types';
import { useToast } from '@/components/Toast';
import { Button, EmptyState, ErrorBanner, Field, IconButton, Screen, SkeletonList, T } from '@/components/ui';
import { Stepper } from '@/components/workouts/parts';
import { GeneratedTag, RoutineExerciseRow, RoutineHeading } from '@/components/workouts/RoutineParts';
import { routineMeta } from '@/components/workouts/routines';
import { registerStartedWorkout } from '@/components/workouts/session';
import { useAction, useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { today } from '@/utils/format';

export default function RotinaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routineId = Number(id);
  const toast = useToast();
  const { data, error, loading, refreshing, refresh, reload, setData } = useApi(() => routineApi.get(routineId), [routineId]);

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [busyItem, setBusyItem] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const save = useAction(routineApi.update);
  const start = useAction(routineApi.start);

  const loadedId = data?.id;
  useEffect(() => {
    if (data) {
      setName(data.name);
      setNotes(data.notes ?? '');
    }
    // Só ao carregar a rotina (não sobrescreve o que está sendo digitado).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedId]);

  const dirty = !!data && (name.trim() !== data.name || (notes.trim() || null) !== (data.notes || null));

  async function saveInfo() {
    if (!name.trim()) {
      setNameError('A rotina precisa de um nome.');
      return false;
    }
    setNameError(undefined);
    const updated = await save.run(routineId, { name: name.trim(), notes: notes.trim() });
    if (!updated) return false;
    setData(updated);
    toast.success('Rotina salva');
    return true;
  }

  async function toggleEdit() {
    if (editMode && dirty && !(await saveInfo())) return;
    setEditMode((v) => !v);
    setEditingItem(null);
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

  function removeItem(item: RoutineExercise) {
    Alert.alert('Remover exercício?', `${item.exerciseName} sai desta rotina.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => void runItem(item.id, () => routineApi.removeExercise(item.id)) },
    ]);
  }

  async function startWorkout() {
    if (dirty && !(await saveInfo())) return;
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
  const meta = data ? routineMeta(data, 0) : null;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      contentStyle={{ gap: 14 }}
      footer={
        data ? (
          <Button
            title="Iniciar treino"
            icon="play"
            onPress={startWorkout}
            loading={start.pending}
            disabled={exercises.length === 0}
            style={{ height: 60, borderRadius: 20 }}
          />
        ) : null
      }
    >
      <View style={styles.header}>
        <IconButton icon="back" label="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/rotinas'))} />
        {meta?.generated ? <GeneratedTag /> : <View />}
        {data ? (
          <IconButton
            icon={editMode ? 'check' : 'edit'}
            label={editMode ? 'Concluir edição' : 'Editar rotina'}
            color={editMode ? colors.accent : colors.text}
            onPress={toggleEdit}
          />
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={4} /> : null}

      {data && meta ? (
        <>
          {editMode ? (
            <View style={{ gap: 12 }}>
              <Field label="Nome" value={name} onChangeText={setName} error={nameError} maxLength={80} />
              <Field label="Observações" value={notes} onChangeText={setNotes} placeholder="Opcional" multiline maxLength={300} />
              {save.error ? <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold }}>{save.error}</T> : null}
              {dirty ? <Button title="Salvar alterações" variant="secondary" small onPress={saveInfo} loading={save.pending} /> : null}
            </View>
          ) : (
            <RoutineHeading meta={meta} name={data.name} />
          )}

          {!editMode && data.notes && !meta.generated ? <T variant="caption" style={{ fontSize: 13 }}>{data.notes}</T> : null}
          {start.error ? <ErrorBanner title="Não foi possível iniciar" message={start.error} /> : null}

          {exercises.length === 0 ? (
            <EmptyState icon="dumbbell" title="Nenhum exercício ainda" message="Adicione exercícios do catálogo com séries, repetições e descanso." />
          ) : (
            <View style={{ gap: 8 }}>
              {exercises.map((item, i) => (
                <RoutineExerciseRow
                  key={item.id}
                  item={item}
                  index={i}
                  onPress={
                    editMode
                      ? () => setEditingItem((e) => (e === item.id ? null : item.id))
                      : () => router.push({ pathname: '/exercicios/[id]', params: { id: String(item.exerciseId) } })
                  }
                  footer={
                    editMode ? (
                      <ItemEditor
                        item={item}
                        isFirst={i === 0}
                        isLast={i === exercises.length - 1}
                        busy={busyItem === item.id}
                        open={editingItem === item.id}
                        onToggle={() => setEditingItem((e) => (e === item.id ? null : item.id))}
                        onMove={(d) => void runItem(item.id, () => routineApi.updateExercise(item.id, { position: item.position + d }))}
                        onRemove={() => removeItem(item)}
                        onSave={async (values) => {
                          await runItem(item.id, () => routineApi.updateExercise(item.id, values));
                          setEditingItem(null);
                        }}
                      />
                    ) : null
                  }
                />
              ))}
            </View>
          )}

          <Button
            title="Adicionar exercício"
            icon="plus"
            variant="dashed"
            small
            onPress={() => router.push({ pathname: '/exercicios', params: { pickFor: 'routine', targetId: String(routineId) } })}
          />

          {editMode ? (
            <Button title="Excluir rotina" icon="trash" variant="danger" onPress={confirmDelete} loading={deleting} />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function ItemEditor({
  item,
  isFirst,
  isLast,
  busy,
  open,
  onToggle,
  onMove,
  onRemove,
  onSave,
}: {
  item: RoutineExercise;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  open: boolean;
  onToggle: () => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  onSave: (v: { targetSets: number; targetReps: string; restSeconds: number }) => Promise<void>;
}) {
  const [sets, setSets] = useState(item.targetSets ?? 3);
  const [reps, setReps] = useState(item.targetReps ?? '8-12');
  const [rest, setRest] = useState(item.restSeconds ?? 90);
  const [repsError, setRepsError] = useState<string>();

  useEffect(() => {
    if (open) {
      setSets(item.targetSets ?? 3);
      setReps(item.targetReps ?? '8-12');
      setRest(item.restSeconds ?? 90);
      setRepsError(undefined);
    }
  }, [open, item]);

  function submit() {
    if (!/^\d{1,3}(\s*-\s*\d{1,3})?$/.test(reps.trim())) {
      setRepsError('Use um número ou faixa, ex: 10 ou 8-12.');
      return;
    }
    void onSave({ targetSets: sets, targetReps: reps.replace(/\s/g, ''), restSeconds: rest });
  }

  return (
    <View style={[{ gap: 10 }, busy && { opacity: 0.6 }]}>
      {open ? (
        <>
          <Stepper label="Séries" value={String(sets)} onMinus={() => setSets((n) => Math.max(1, n - 1))} onPlus={() => setSets((n) => Math.min(20, n + 1))} />
          <Field label="Repetições" value={reps} onChangeText={setReps} error={repsError} placeholder="8-12" keyboardType="numbers-and-punctuation" maxLength={9} />
          <Stepper label="Descanso (s)" value={String(rest)} onMinus={() => setRest((n) => Math.max(0, n - 15))} onPlus={() => setRest((n) => Math.min(600, n + 15))} />
        </>
      ) : null}
      <View style={styles.actions}>
        <IconButton icon="chevronDown" label="Mover para cima" onPress={isFirst ? undefined : () => onMove(-1)} style={[styles.up, isFirst && styles.disabled]} size={40} />
        <IconButton icon="chevronDown" label="Mover para baixo" onPress={isLast ? undefined : () => onMove(1)} style={isLast ? styles.disabled : null} size={40} />
        <IconButton icon="trash" label="Remover da rotina" color={colors.danger} onPress={onRemove} size={40} />
        <View style={{ flex: 1 }} />
        {open ? (
          <Button title="Salvar" small onPress={submit} loading={busy} style={{ paddingHorizontal: 22 }} />
        ) : (
          <Button title="Metas" icon="edit" variant="secondary" small onPress={onToggle} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  up: { transform: [{ rotate: '180deg' }] },
  disabled: { opacity: 0.3 },
});
