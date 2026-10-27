import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { routineApi } from '@/api/endpoints';
import type { EquipmentType, TrainingGoal, TrainingLevel } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, Checkbox, ErrorBanner, IconButton, Screen, T } from '@/components/ui';
import { Segmented, ToggleChip } from '@/components/workouts/parts';
import { EXERCISES_PER_DAY, GOAL_SCHEME, setGeneratedPreview, splitLabel } from '@/components/workouts/routines';
import { useAction } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';
import { EQUIPMENT_LABELS, GOAL_LABELS, LEVEL_LABELS } from '@/utils/ranks';

const GOALS: TrainingGoal[] = ['STRENGTH', 'HYPERTROPHY', 'ENDURANCE'];
const LEVELS = (['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as TrainingLevel[]).map((v) => ({ value: v, label: LEVEL_LABELS[v] }));
const EQUIPMENT: EquipmentType[] = ['BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT'];
const DAYS = [1, 2, 3, 4, 5, 6];

export default function GerarRotinaScreen() {
  const userId = useUserId();
  const toast = useToast();
  const [goal, setGoal] = useState<TrainingGoal>('HYPERTROPHY');
  const [days, setDays] = useState(3);
  const [level, setLevel] = useState<TrainingLevel>('BEGINNER');
  const [equipment, setEquipment] = useState<EquipmentType[]>(EQUIPMENT);
  const [save, setSave] = useState(true);
  const [equipError, setEquipError] = useState<string>();
  const generate = useAction(routineApi.generate);

  function toggle(e: EquipmentType) {
    setEquipError(undefined);
    setEquipment((list) => (list.includes(e) ? list.filter((x) => x !== e) : [...list, e]));
  }

  async function submit() {
    if (!equipment.length) {
      setEquipError('Escolha pelo menos um equipamento.');
      return;
    }
    const routines = await generate.run(userId, { goal, daysPerWeek: days, level, equipment, save });
    if (!routines) return;
    if (!routines.length) {
      toast.error('Nenhuma rotina gerada com esses filtros.');
      return;
    }
    if (save) {
      toast.success(routines.length === 1 ? '1 rotina criada' : `${routines.length} rotinas criadas`);
      if (routines.length === 1 && routines[0].id) router.replace({ pathname: '/rotinas/[id]', params: { id: String(routines[0].id) } });
      else router.dismissTo('/rotinas');
    } else {
      setGeneratedPreview({ routines, goal, level });
      router.push('/rotinas/previa');
    }
  }

  const perDay = EXERCISES_PER_DAY[level];

  return (
    <Screen
      contentStyle={{ gap: 16 }}
      footer={
        <Button title={days === 1 ? 'Gerar 1 rotina' : `Gerar ${days} rotinas`} onPress={submit} loading={generate.pending} />
      }
    >
      <View style={styles.header}>
        <IconButton icon="close" label="Fechar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/rotinas'))} />
        <Text style={styles.title}>Gerar rotina</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.hero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.heroIcon}>
          <Icon name="dumbbell" size={40} color={colors.accent} strokeWidth={1.8} />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <T variant="label">Objetivo</T>
        <View style={styles.goals} accessibilityRole="radiogroup" accessibilityLabel="Objetivo">
          {GOALS.map((g) => {
            const active = g === goal;
            const sc = GOAL_SCHEME[g];
            return (
              <Pressable
                key={g}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setGoal(g)}
                style={[styles.goal, active && styles.goalActive]}
              >
                <Text style={[styles.goalName, active && { fontFamily: fonts.extrabold }]}>{GOAL_LABELS[g]}</Text>
                <Text style={[styles.goalScheme, active && { color: colors.textLabel }]}>
                  {sc.sets}×{sc.reps} · {sc.rest}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <View style={styles.rowBetween}>
          <T variant="label">Dias por semana</T>
          <T variant="caption">Divisão: {splitLabel(days, level)}</T>
        </View>
        <View style={styles.days} accessibilityRole="radiogroup" accessibilityLabel="Dias por semana">
          {DAYS.map((d) => {
            const active = d === days;
            return (
              <Pressable
                key={d}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${d} ${d === 1 ? 'dia' : 'dias'}`}
                onPress={() => setDays(d)}
                style={[styles.day, active && { backgroundColor: colors.accent, borderColor: colors.accent }]}
              >
                <Text style={[styles.dayText, active && { color: colors.onAccent, fontFamily: fonts.display }]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <T variant="label">Nível</T>
        <Segmented<TrainingLevel> label="Nível" options={LEVELS} value={level} onChange={setLevel} activeColor={colors.text} />
        <T variant="caption" style={{ fontSize: 11 }}>
          {LEVEL_LABELS[level]}: {perDay} exercícios por dia
        </T>
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

      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: save }} onPress={() => setSave((v) => !v)} style={styles.saveRow}>
        <Checkbox checked={save} onPress={() => setSave((v) => !v)} label="Salvar nas minhas rotinas" size={22} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.saveTitle}>Salvar nas minhas rotinas</Text>
          <T variant="caption" style={{ fontSize: 11 }}>Desmarque para só ver a sugestão</T>
        </View>
      </Pressable>

      {generate.error ? <ErrorBanner title="Não foi possível gerar" message={generate.error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.title, fontSize: 16, color: colors.text },
  hero: { alignItems: 'center' },
  heroIcon: { width: 84, height: 70, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  goals: { flexDirection: 'row', gap: 8 },
  goal: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 2,
  },
  goalActive: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSoft },
  goalName: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  goalScheme: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  days: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, height: 46, borderRadius: radius.icon, borderWidth: 1, borderColor: colors.borderInput, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontFamily: fonts.title, fontSize: 15, color: colors.textSoft },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 56,
  },
  saveTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
});
