import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { routineApi } from '@/api/endpoints';
import type { Routine } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { useToast } from '@/components/Toast';
import { Button, Chip, ChipRow, EmptyState, IconButton, Screen, T } from '@/components/ui';
import { GeneratedTag, RoutineExerciseRow, RoutineHeading } from '@/components/workouts/RoutineParts';
import { getGeneratedPreview, replacePreviewRoutine, routineMeta } from '@/components/workouts/routines';
import { colors } from '@/theme';
import { GOAL_LABELS, LEVEL_LABELS } from '@/utils/ranks';

// Prévia das rotinas sugeridas pelo gerador quando "Salvar nas minhas rotinas" estava desmarcado.
export default function PreviaRotinaScreen() {
  const userId = useUserId();
  const toast = useToast();
  const [preview, setPreview] = useState(getGeneratedPreview());
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState<'one' | 'all' | null>(null);

  const routines = preview?.routines ?? [];
  const current = routines[index];

  async function saveRoutine(r: Routine, i: number) {
    const saved = await routineApi.create(userId, {
      name: r.name,
      notes: r.notes ?? undefined,
      exercises: r.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        targetSets: e.targetSets ?? undefined,
        targetReps: e.targetReps ?? undefined,
        restSeconds: e.restSeconds ?? undefined,
      })),
    });
    replacePreviewRoutine(i, saved);
    setPreview(getGeneratedPreview());
    return saved;
  }

  async function saveOne() {
    if (!current || current.id) return;
    setSaving('one');
    try {
      await saveRoutine(current, index);
      toast.success('Rotina salva');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar a rotina.');
    } finally {
      setSaving(null);
    }
  }

  async function saveAll() {
    setSaving('all');
    try {
      let count = 0;
      for (let i = 0; i < routines.length; i++) {
        if (!routines[i].id) {
          await saveRoutine(routines[i], i);
          count++;
        }
      }
      toast.success(count === 1 ? '1 rotina salva' : `${count} rotinas salvas`);
      router.dismissTo('/rotinas');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar as rotinas.');
    } finally {
      setSaving(null);
    }
  }

  const unsaved = routines.filter((r) => !r.id).length;
  const meta = current ? routineMeta(current, index) : null;
  if (meta && preview) {
    meta.goal = meta.goal ?? GOAL_LABELS[preview.goal];
    meta.level = meta.level ?? LEVEL_LABELS[preview.level];
  }

  return (
    <Screen
      contentStyle={{ gap: 14 }}
      footer={
        current ? (
          current.id ? (
            <Button
              title="Abrir rotina salva"
              onPress={() => router.replace({ pathname: '/rotinas/[id]', params: { id: String(current.id) } })}
            />
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {unsaved > 1 ? (
                <Button title="Salvar todas" variant="secondary" onPress={saveAll} loading={saving === 'all'} disabled={saving !== null} style={{ flex: 1 }} />
              ) : null}
              <Button title="Salvar" icon="check" onPress={saveOne} loading={saving === 'one'} disabled={saving !== null} style={{ flex: 1 }} />
            </View>
          )
        ) : null
      }
    >
      <View style={styles.header}>
        <IconButton icon="back" label="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/rotinas'))} />
        <GeneratedTag label={current?.id ? 'Salva nas suas rotinas' : 'Sugestão gerada'} />
        <View style={{ width: 44 }} />
      </View>

      {!current || !meta ? (
        <EmptyState
          icon="sparkles"
          title="Nenhuma sugestão aberta"
          message="Gere rotinas novamente para ver a sugestão."
          action="Gerar rotina"
          onAction={() => router.replace('/rotinas/gerar')}
        />
      ) : (
        <>
          {routines.length > 1 ? (
            <ChipRow>
              {routines.map((r, i) => (
                <Chip key={i} label={`Treino ${routineMeta(r, i).letter}${r.id ? ' ✓' : ''}`} active={i === index} onPress={() => setIndex(i)} />
              ))}
            </ChipRow>
          ) : null}

          <RoutineHeading meta={meta} name={current.name} />

          <View style={{ gap: 8 }}>
            {current.exercises.map((e, i) => (
              <RoutineExerciseRow
                key={`${e.exerciseId}-${i}`}
                item={e}
                index={i}
                onPress={() => router.push({ pathname: '/exercicios/[id]', params: { id: String(e.exerciseId) } })}
              />
            ))}
          </View>
          <T variant="caption" color={colors.textMuted}>
            Esta é só uma sugestão. Salve para editar os exercícios e iniciar o treino.
          </T>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
