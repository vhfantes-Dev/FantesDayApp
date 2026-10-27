import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { exerciseApi, routineApi, workoutApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, ErrorBanner, Field, Header, IconButton, LoadingView, Screen, T } from '@/components/ui';
import { categoryLabel, equipmentLabel, levelLabel, sourceLabel } from '@/components/workouts/labels';
import { Stepper } from '@/components/workouts/parts';
import { useApi } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';

type PickFor = 'workout' | 'routine' | 'swap';

export default function ExercicioScreen() {
  const params = useLocalSearchParams<{ id: string; pickFor?: string; targetId?: string }>();
  const exerciseId = Number(params.id);
  const pickFor: PickFor | null =
    params.pickFor === 'workout' || params.pickFor === 'routine' || params.pickFor === 'swap' ? params.pickFor : null;
  const targetId = params.targetId ? Number(params.targetId) : null;
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi(() => exerciseApi.get(exerciseId), [exerciseId]);

  const [imageFailed, setImageFailed] = useState(false);
  const [targetName, setTargetName] = useState<string | null>(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState('8-12');
  const [rest, setRest] = useState(90);
  const [repsError, setRepsError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!pickFor || !targetId || pickFor === 'swap') return;
    const p = pickFor === 'workout' ? workoutApi.get(targetId).then((w) => w.workoutType) : routineApi.get(targetId).then((r) => r.name);
    p.then(setTargetName).catch(() => undefined);
  }, [pickFor, targetId]);

  const isOwner = !!data && data.source === 'CUSTOM' && data.createdById === user?.id;

  async function pick() {
    if (!pickFor || !targetId || !data) return;
    if (pickFor === 'routine' && !/^\d{1,3}(-\d{1,3})?$/.test(reps.replace(/\s/g, ''))) {
      setRepsError('Use um número ou faixa, ex: 10 ou 8-12.');
      return;
    }
    setRepsError(undefined);
    setPending(true);
    try {
      if (pickFor === 'workout') await workoutApi.addExercise(targetId, data.id);
      else if (pickFor === 'routine')
        await routineApi.addExercise(targetId, { exerciseId: data.id, targetSets: sets, targetReps: reps.replace(/\s/g, ''), restSeconds: rest });
      else await workoutApi.swapExercise(targetId, data.id);
      toast.success(pickFor === 'swap' ? `Trocado por ${data.name}` : `${data.name} adicionado`);
      // Volta para o treino/rotina (fecha o detalhe e o catálogo).
      router.dismiss(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível adicionar o exercício.');
      setPending(false);
    }
  }

  function confirmDelete() {
    if (!data) return;
    Alert.alert('Excluir exercício?', `${data.name} será removido do catálogo. Exercícios usados em treinos ou rotinas não podem ser excluídos.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await exerciseApi.remove(data.id);
            toast.success('Exercício excluído');
            router.back();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Não foi possível excluir o exercício.');
            setDeleting(false);
          }
        },
      },
    ]);
  }

  const steps = (data?.instructions ?? '')
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const secondary = (data?.secondaryMuscles ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const meta = [equipmentLabel(data?.equipment), levelLabel(data?.level), categoryLabel(data?.category)].filter(Boolean).join(' · ');
  const pickTitle =
    pickFor === 'swap' ? 'Trocar por este exercício' : pickFor === 'workout' ? `Adicionar ao ${targetName ?? 'treino'}` : `Adicionar à ${targetName ?? 'rotina'}`;

  if (!data) {
    return (
      <Screen>
        <Header title="Exercício" />
        {error ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
        {loading ? <LoadingView /> : null}
      </Screen>
    );
  }

  return (
    <Screen glow="none" contentStyle={{ paddingTop: 0, paddingHorizontal: 0, gap: 0 }}>
      <View style={[styles.hero, { height: 230 + insets.top }]}>
        {data.imageUrl && !imageFailed ? (
          <Image
            source={{ uri: data.imageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
            accessibilityLabel={`Imagem de ${data.name}`}
          />
        ) : (
          <View style={{ alignItems: 'center', gap: 10, paddingTop: insets.top }}>
            <Icon name="image" size={48} color={colors.textDone} strokeWidth={1.4} />
            <T variant="caption" color={colors.textDone} style={{ fontFamily: fonts.semibold }}>Sem imagem</T>
          </View>
        )}
        <View style={[styles.heroBar, { top: insets.top + 12 }]}>
          <IconButton icon="back" label="Voltar" onPress={() => router.back()} style={styles.floating} />
          {isOwner ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <IconButton icon="edit" label="Editar exercício" onPress={() => router.push({ pathname: '/exercicios/novo', params: { id: String(data.id) } })} style={styles.floating} />
              <IconButton icon="trash" label="Excluir exercício" color={colors.danger} onPress={confirmDelete} style={[styles.floating, deleting && { opacity: 0.5 }]} />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <View style={{ gap: 10 }}>
          <Text style={styles.title}>{data.name}</Text>
          <View style={styles.tags}>
            {data.muscleGroup ? (
              <View style={[styles.pill, { backgroundColor: colors.accent }]}>
                <Text style={[styles.pillText, { color: colors.onAccent }]}>{data.muscleGroup}</Text>
              </View>
            ) : null}
            {secondary.map((m) => (
              <View key={m} style={[styles.pill, { backgroundColor: colors.surface2 }]}>
                <Text style={styles.pillText}>{m}</Text>
              </View>
            ))}
            {meta ? (
              <View style={[styles.pill, styles.pillOutline]}>
                <Text style={styles.pillText}>{meta}</Text>
              </View>
            ) : null}
          </View>
          <T variant="caption">{sourceLabel(data.source)}{data.source === 'CUSTOM' && isOwner ? ' · criado por você' : ''}</T>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={styles.overline}>COMO FAZER</Text>
          {steps.length === 0 ? (
            <T variant="caption" style={{ fontSize: 14 }}>Sem instruções cadastradas.</T>
          ) : (
            steps.map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/exercicios/historico/[id]', params: { id: String(data.id) } })}
          style={({ pressed }) => [styles.evolution, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.evolutionIcon}>
            <Icon name="trendUp" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T style={{ fontFamily: fonts.bold }}>Ver evolução</T>
            <T variant="caption">1RM estimado e volume ao longo do tempo</T>
          </View>
          <Icon name="chevronRight" size={18} color={colors.textMuted} />
        </Pressable>

        {pickFor && targetId ? (
          <>
            {pickFor === 'routine' ? (
              <View style={styles.targets}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.text }}>Na {targetName ?? 'rotina'}</Text>
                <Stepper label="Séries" value={String(sets)} onMinus={() => setSets((n) => Math.max(1, n - 1))} onPlus={() => setSets((n) => Math.min(20, n + 1))} />
                <Field label="Repetições" value={reps} onChangeText={setReps} error={repsError} keyboardType="numbers-and-punctuation" maxLength={9} />
                <Stepper label="Descanso (s)" value={String(rest)} onMinus={() => setRest((n) => Math.max(0, n - 15))} onPlus={() => setRest((n) => Math.min(600, n + 15))} />
              </View>
            ) : null}
            <Button title={pickTitle} onPress={pick} loading={pending} />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroBar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  floating: { backgroundColor: 'rgba(10,12,15,0.8)' },
  body: { gap: 16, paddingHorizontal: 20, paddingTop: 20 },
  title: { fontFamily: fonts.title, fontSize: 22, letterSpacing: -0.4, lineHeight: 28, color: colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.chip },
  pillOutline: { borderWidth: 1, borderColor: colors.borderInput },
  pillText: { fontFamily: fonts.bold, fontSize: 12, color: colors.textSoft },
  overline: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.8, color: colors.textMuted },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.accent },
  stepText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.textSoft },
  evolution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  evolutionIcon: { width: 44, height: 44, borderRadius: radius.icon, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  targets: { gap: 12, padding: 16, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
