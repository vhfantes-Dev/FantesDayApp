import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { routineApi, workoutApi } from '@/api/endpoints';
import type { EquipmentType, TrainingGoal, TrainingLevel } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, Field, IconButton, Screen, T } from '@/components/ui';
import { formatBrDate, parseBrDate } from '@/components/workouts/labels';
import { OptionGrid, Segmented, ToggleChip } from '@/components/workouts/parts';
import { useAction } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { today } from '@/utils/format';
import { EQUIPMENT_LABELS, GOAL_LABELS, LEVEL_LABELS } from '@/utils/ranks';

type Mode = 'livre' | 'rotina' | 'gerar';

const XP_OPTIONS = [30, 50, 80, 100].map((v) => ({ value: v, label: String(v) }));
const DAY_OPTIONS = [1, 2, 3, 4, 5, 6].map((v) => ({ value: v, label: String(v) }));
const GOALS = (Object.keys(GOAL_LABELS) as TrainingGoal[]).map((v) => ({ value: v, label: GOAL_LABELS[v] }));
const LEVELS = (Object.keys(LEVEL_LABELS) as TrainingLevel[]).map((v) => ({ value: v, label: LEVEL_LABELS[v] }));
const EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as EquipmentType[];

export default function NovoTreinoScreen() {
  const params = useLocalSearchParams<{ modo?: string }>();
  const initial: Mode = params.modo === 'rotina' || params.modo === 'gerar' ? params.modo : 'livre';
  const [mode, setMode] = useState<Mode>(initial);

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
          { value: 'gerar', label: 'Gerar rotinas' },
        ]}
      />

      {mode === 'livre' ? <FreeWorkoutForm /> : mode === 'rotina' ? <RoutineForm /> : <GenerateForm />}
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
      {create.error ? <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold }}>{create.error}</T> : null}
      <Button title="Criar rotina" onPress={submit} loading={create.pending} style={{ marginTop: 8 }} />
    </>
  );
}

function GenerateForm() {
  const userId = useUserId();
  const toast = useToast();
  const [goal, setGoal] = useState<TrainingGoal>('HYPERTROPHY');
  const [days, setDays] = useState(3);
  const [level, setLevel] = useState<TrainingLevel>('BEGINNER');
  const [equipment, setEquipment] = useState<EquipmentType[]>(EQUIPMENT);
  const [equipError, setEquipError] = useState<string>();
  const generate = useAction(routineApi.generate);

  function toggle(e: EquipmentType) {
    setEquipment((list) => (list.includes(e) ? list.filter((x) => x !== e) : [...list, e]));
  }

  async function submit() {
    if (!equipment.length) {
      setEquipError('Escolha pelo menos um equipamento.');
      return;
    }
    setEquipError(undefined);
    const routines = await generate.run(userId, { goal, daysPerWeek: days, level, equipment, save: true });
    if (!routines) return;
    toast.success(routines.length === 1 ? '1 rotina criada' : `${routines.length} rotinas criadas`);
    router.dismissTo('/treinos');
  }

  return (
    <>
      <View style={{ gap: 8 }}>
        <T variant="label">Objetivo</T>
        <Segmented<TrainingGoal> label="Objetivo" options={GOALS} value={goal} onChange={setGoal} />
        <T variant="caption">{goalHint(goal)}</T>
      </View>
      <View style={{ gap: 8 }}>
        <T variant="label">Dias por semana</T>
        <OptionGrid label="Dias por semana" options={DAY_OPTIONS} value={days} onChange={setDays} />
        <T variant="caption">{splitHint(days, level)}</T>
      </View>
      <View style={{ gap: 8 }}>
        <T variant="label">Nível</T>
        <Segmented<TrainingLevel> label="Nível" options={LEVELS} value={level} onChange={setLevel} />
      </View>
      <View style={{ gap: 8 }}>
        <T variant="label">Equipamentos disponíveis</T>
        <View style={styles.wrap}>
          {EQUIPMENT.map((e) => (
            <ToggleChip key={e} label={EQUIPMENT_LABELS[e]} active={equipment.includes(e)} onPress={() => toggle(e)} />
          ))}
        </View>
        {equipError ? <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold }}>{equipError}</T> : null}
      </View>
      {generate.error ? <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold }}>{generate.error}</T> : null}
      <Button title="Gerar rotinas" icon="sparkles" onPress={submit} loading={generate.pending} style={{ marginTop: 8 }} />
    </>
  );
}

function goalHint(goal: TrainingGoal) {
  switch (goal) {
    case 'STRENGTH':
      return '4 séries de 3-6 repetições · 180 s de descanso';
    case 'ENDURANCE':
      return '3 séries de 15-20 repetições · 45 s de descanso';
    default:
      return '3 séries de 8-12 repetições · 90 s de descanso';
  }
}

function splitHint(days: number, level: TrainingLevel) {
  if (days <= 2) return 'Divisão: Full Body';
  if (days === 3) return level === 'BEGINNER' ? 'Divisão: Full Body' : 'Divisão: Push / Pull / Legs';
  if (days === 4) return 'Divisão: Superiores / Inferiores';
  if (days === 5) return 'Divisão: Push / Pull / Legs + Superiores / Inferiores';
  return 'Divisão: Push / Pull / Legs duas vezes';
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
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
