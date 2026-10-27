import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { routineApi, workoutApi } from '@/api/endpoints';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, Field, IconButton, Screen, T } from '@/components/ui';
import { formatBrDate, parseBrDate } from '@/components/workouts/labels';
import { OptionGrid, Segmented } from '@/components/workouts/parts';
import { useAction } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { today } from '@/utils/format';

type Mode = 'livre' | 'rotina';

const XP_OPTIONS = [30, 50, 80, 100].map((v) => ({ value: v, label: String(v) }));

export default function NovoTreinoScreen() {
  const params = useLocalSearchParams<{ modo?: string }>();
  const initial: Mode = params.modo === 'rotina' ? 'rotina' : 'livre';
  const [mode, setMode] = useState<Mode>(initial);

  // O gerador agora tem tela própria.
  useEffect(() => {
    if (params.modo === 'gerar') router.replace('/rotinas/gerar');
  }, [params.modo]);

  return (
    <Screen contentStyle={{ gap: 20 }}>
      <View style={styles.header}>
        <IconButton icon="close" label="Fechar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/treinos'))} />
        <Text style={styles.title}>Novo treino</Text>
        <View style={{ width: 44 }} />
      </View>

      <Segmented<Mode>
        label="Tipo"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'livre', label: 'Treino livre' },
          { value: 'rotina', label: 'Rotina' },
        ]}
      />

      {mode === 'livre' ? <FreeWorkoutForm /> : <RoutineForm />}
    </Screen>
  );
}

function FreeWorkoutForm() {
  const userId = useUserId();
  const toast = useToast();
  const [name, setName] = useState('');
  const [date, setDate] = useState(formatBrDate(today()));
  const [xp, setXp] = useState(50);
  const [errors, setErrors] = useState<{ name?: string; date?: string }>({});
  const create = useAction(workoutApi.create);

  async function submit() {
    const iso = parseBrDate(date);
    const next = {
      name: name.trim() ? undefined : 'Dê um nome ao treino.',
      date: iso ? (iso > today() ? 'A data não pode ser no futuro.' : undefined) : 'Use o formato dd/mm/aaaa.',
    };
    setErrors(next);
    if (next.name || next.date || !iso) return;
    const workout = await create.run(userId, { workoutType: name.trim(), date: iso, xpEarned: xp });
    if (!workout) return;
    toast.success(`Treino criado · +${xp} XP`);
    router.replace({ pathname: '/treinos/[id]', params: { id: String(workout.id) } });
    router.push({ pathname: '/exercicios', params: { pickFor: 'workout', targetId: String(workout.id) } });
  }

  return (
    <>
      <Field
        label="Nome do treino"
        placeholder="Ex: Treino B - Costas e Bíceps"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoFocus
        returnKeyType="next"
        maxLength={80}
      />
      <Field label="Data" value={date} onChangeText={setDate} error={errors.date} keyboardType="numbers-and-punctuation" placeholder="dd/mm/aaaa" maxLength={10} />
      <View style={{ gap: 8 }}>
        <T variant="label">XP ao concluir</T>
        <OptionGrid label="XP ao concluir" options={XP_OPTIONS} value={xp} onChange={setXp} />
      </View>

      <View style={styles.dashedBox}>
        <View style={styles.dashedIcon}>
          <Icon name="dumbbell" size={26} color={colors.accent} />
        </View>
        <T style={{ fontFamily: fonts.bold }}>Nenhum exercício ainda</T>
        <T variant="caption" style={{ fontSize: 13, lineHeight: 20, textAlign: 'center' }}>Crie o treino e escolha os exercícios no catálogo.</T>
      </View>

      {create.error ? <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold }}>{create.error}</T> : null}
      <Button title="Criar e adicionar exercícios" onPress={submit} loading={create.pending} style={{ marginTop: 8 }} />
    </>
  );
}

function RoutineForm() {
  const userId = useUserId();
  const toast = useToast();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState<string>();
  const create = useAction(routineApi.create);

  async function submit() {
    if (!name.trim()) {
      setNameError('Dê um nome à rotina.');
      return;
    }
    setNameError(undefined);
    const routine = await create.run(userId, { name: name.trim(), notes: notes.trim() || undefined });
    if (!routine?.id) return;
    toast.success('Rotina criada');
    router.replace({ pathname: '/rotinas/[id]', params: { id: String(routine.id) } });
  }

  return (
    <>
      <Field label="Nome da rotina" placeholder="Ex: Treino A - Peito e Tríceps" value={name} onChangeText={setName} error={nameError} autoFocus maxLength={80} />
      <Field label="Observações (opcional)" placeholder="Ex: foco em cadência lenta" value={notes} onChangeText={setNotes} multiline maxLength={300} />
      <T variant="caption" style={{ fontSize: 13, lineHeight: 20 }}>
        Uma rotina é um modelo reutilizável: escolha os exercícios com séries, repetições e descanso e inicie quando quiser.
      </T>
      <Pressable accessibilityRole="button" onPress={() => router.push('/rotinas/gerar')} style={({ pressed }) => [styles.genLink, pressed && { opacity: 0.85 }]}>
        <Icon name="sparkles" size={20} color={colors.accent} />
        <View style={{ flex: 1, gap: 2 }}>
          <T style={{ fontFamily: fonts.bold }}>Prefere gerar automaticamente?</T>
          <T variant="caption">Pelo objetivo, dias por semana, nível e equipamentos</T>
        </View>
        <Icon name="chevronRight" size={18} color={colors.accent} />
      </Pressable>
      {create.error ? <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold }}>{create.error}</T> : null}
      <Button title="Criar rotina" onPress={submit} loading={create.pending} style={{ marginTop: 8 }} />
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.title, fontSize: 16, color: colors.text },
  dashedBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
  },
  dashedIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  genLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentSoftBorder,
  },
});
