// Peças visuais compartilhadas pelas telas de treinos, rotinas e exercícios.
import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { workoutApi } from '@/api/endpoints';
import type { Workout, WorkoutSet } from '@/api/types';
import { Icon, type IconName } from '@/components/Icon';
import { Button, T } from '@/components/ui';
import { colors, fonts, radius } from '@/theme';
import { formatDecimal, formatNumber, parseIsoDate, parseNumber, weekdayShort } from '@/utils/format';

// Cores pontuais do design (sequência = laranja, recorde = dourado).
export const STREAK = { bg: '#221A10', border: '#4A3216', text: '#FFB25B', flame: '#FF8A3D', soft: '#C9B39A' };
export const GOLD = { color: '#F2C14E', bg: '#221D10', border: '#5A4718' };
export const DONE_ROW = '#16201A';
export const ACCENT_BORDER = '#3A4A26';

export function ExerciseThumb({ uri, size = 64, icon = 'dumbbell' }: { uri?: string | null; size?: number; icon?: IconName }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[s.thumb, { width: size, height: size, borderRadius: size > 48 ? 14 : 12 }]}>
      {uri && !failed ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      ) : (
        <Icon name={icon} size={Math.round(size * 0.4)} color={colors.textSoft} strokeWidth={1.6} />
      )}
    </View>
  );
}

// Pílula laranja da sequência (cabeçalho de Treinos).
export function StreakPill({ days, active, onPress }: { days: number; active: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sequência de ${days} dias`}
      onPress={onPress}
      style={({ pressed }) => [s.streakPill, !active && { opacity: 0.6 }, pressed && { opacity: 0.8 }]}
    >
      <FlameIcon size={22} dim={!active} />
      <Text style={s.streakText}>{days}</Text>
    </Pressable>
  );
}

// Chama em degradê do design (laranja → amarelo).
export function FlameIcon({ size = 22, dim }: { size?: number; dim?: boolean }) {
  return (
    <Svg width={size} height={(size * 120) / 100} viewBox="0 0 100 120" opacity={dim ? 0.5 : 1}>
      <Defs>
        <LinearGradient id="flameOuter" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#FF3D1F" />
          <Stop offset="1" stopColor="#FFB03B" />
        </LinearGradient>
        <LinearGradient id="flameInner" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#FFC24D" />
          <Stop offset="1" stopColor="#FFFBEA" />
        </LinearGradient>
      </Defs>
      <Path
        d="M50 4 C58 22 80 36 82 64 C84 92 68 112 50 112 C32 112 16 92 18 64 C20 46 32 38 36 22 C40 34 42 40 44 46 C46 30 50 20 50 4 Z"
        fill="url(#flameOuter)"
      />
      <Path
        d="M50 50 C56 64 66 74 66 88 C66 101 59 108 50 108 C41 108 34 101 34 90 C34 80 41 74 44 66 C46 74 48 78 49 82 C50 72 51 62 50 50 Z"
        fill="url(#flameInner)"
      />
    </Svg>
  );
}

// Linha de +/- do design (Séries, Repetições, Peso).
export function Stepper({
  label,
  value,
  onMinus,
  onPlus,
  highlight,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  highlight?: boolean;
}) {
  return (
    <View style={[s.stepper, highlight && { borderColor: colors.accent }]}>
      <Text style={s.stepperLabel}>{label}</Text>
      <View style={s.stepperControls}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Menos ${label.toLowerCase()}`} onPress={onMinus} style={s.stepBtn} hitSlop={4}>
          <Icon name="minus" size={18} strokeWidth={2.2} />
        </Pressable>
        <Text style={s.stepValue}>{value}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Mais ${label.toLowerCase()}`} onPress={onPlus} style={s.stepBtn} hitSlop={4}>
          <Icon name="plus" size={18} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

// Controle segmentado (Nível: Iniciante / Intermediário / Avançado).
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
  activeColor = colors.accent,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  label?: string;
  activeColor?: string;
}) {
  return (
    <View style={s.segment} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[s.segmentItem, active && { backgroundColor: activeColor }]}
          >
            <Text style={[s.segmentText, active && { color: colors.onAccent, fontFamily: fonts.extrabold }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Grade de opções quadradas (XP ao concluir, dias por semana).
export function OptionGrid<V extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  label?: string;
}) {
  return (
    <View style={s.optionGrid} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[s.option, active && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}
          >
            <Text style={[s.optionText, active && { color: colors.accent, fontFamily: fonts.extrabold }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Chip de seleção múltipla com acento (Músculos secundários, Equipamentos).
export function ToggleChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[s.toggleChip, active && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}
    >
      <Text style={[s.toggleChipText, active && { color: colors.accent, fontFamily: fonts.bold }]}>{label}</Text>
    </Pressable>
  );
}

// Linha de treino (data em caixa + nome + XP), usada no histórico e na aba.
export function WorkoutRow({ workout, subtitle, onPress, faded }: { workout: Workout; subtitle?: string; onPress: () => void; faded?: boolean }) {
  const day = parseIsoDate(workout.date).getDate();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.workoutRow, faded && { opacity: 0.7 }, pressed && { opacity: 0.85 }]}
    >
      <View style={s.dateBox}>
        <Text style={s.dateWeek}>{weekdayShort(workout.date)}</Text>
        <Text style={s.dateDay}>{day}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{workout.workoutType || 'Treino'}</Text>
        {subtitle ? <T variant="caption">{subtitle}</T> : null}
      </View>
      {workout.xpEarned ? <Text style={s.xp}>+{workout.xpEarned}</Text> : null}
    </Pressable>
  );
}

// Botão de atalho (Histórico / Atividades / Exercícios).
export function ShortcutTile({ label, onPress, icon, accent }: { label: string; onPress: () => void; icon?: IconName; accent?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.shortcut, accent && { backgroundColor: colors.accentSoft, borderColor: ACCENT_BORDER }, pressed && { opacity: 0.8 }]}
    >
      {icon ? <Icon name={icon} size={16} color={accent ? colors.accent : colors.textSoft} /> : null}
      <Text style={[s.shortcutText, accent && { color: colors.accent, fontFamily: fonts.extrabold }]}>{label}</Text>
    </Pressable>
  );
}

// Folha inferior genérica.
export function Sheet({ visible, onClose, title, subtitle, children }: { visible: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]} accessibilityViewIsModal>
          <View style={s.grabber} />
          <View style={{ gap: 4 }}>
            <Text style={s.sheetTitle}>{title}</Text>
            {subtitle ? <T variant="caption" style={{ fontSize: 13 }}>{subtitle}</T> : null}
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Lista de opções em folha (substitui o <select> do design).
export function SelectField({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  placeholder?: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 8, flex: 1 }}>
      <T variant="label">{label}</T>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${current?.label ?? 'nenhum'}`} onPress={() => setOpen(true)} style={s.select}>
        <Text style={[s.selectText, !current && { color: colors.textDone }]} numberOfLines={1}>{current?.label ?? placeholder ?? 'Escolher'}</Text>
        <Icon name="chevronDown" size={16} color={colors.textMuted} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 6 }}>
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={[s.selectOption, active && { backgroundColor: colors.accentSoft }]}
              >
                <Text style={[s.selectText, active && { color: colors.accent, fontFamily: fonts.bold }]}>{o.label}</Text>
                {active ? <Icon name="check" size={18} color={colors.accent} strokeWidth={2.4} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>
    </View>
  );
}

// Folha para editar ou excluir uma série registrada.
export function SetEditSheet({
  set,
  index,
  onClose,
  onSaved,
  onDeleted,
}: {
  set: WorkoutSet | null;
  index?: number;
  onClose: () => void;
  onSaved: (s: WorkoutSet) => void;
  onDeleted: (id: number) => void;
}) {
  const [reps, setReps] = useState(0);
  const [kg, setKg] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (set) {
      setReps(set.reps);
      setKg(set.weightKg ?? 0);
      setError(null);
    }
  }, [set]);

  async function save() {
    if (!set) return;
    if (reps <= 0) {
      setError('As repetições precisam ser maiores que zero.');
      return;
    }
    setPending(true);
    try {
      const updated = await workoutApi.updateSet(set.id, { reps, weightKg: kg > 0 ? kg : null });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar a série.');
    } finally {
      setPending(false);
    }
  }

  function remove() {
    if (!set) return;
    Alert.alert('Excluir série?', 'Essa série sai do treino e do cálculo de recordes.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setPending(true);
          try {
            await workoutApi.removeSet(set.id);
            onDeleted(set.id);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Não foi possível excluir a série.');
          } finally {
            setPending(false);
          }
        },
      },
    ]);
  }

  const before = set ? `Antes: ${formatDecimal(set.weightKg ?? 0)} kg × ${set.reps}` : '';
  const oneRm = kg > 0 && reps <= 20 ? kg * (1 + reps / 30) : null;

  return (
    <Sheet
      visible={!!set}
      onClose={onClose}
      title={index ? `Série ${index}` : 'Editar série'}
      subtitle={set?.exerciseName}
    >
      <View style={{ gap: 10 }}>
        <Stepper label="Repetições" value={String(reps)} onMinus={() => setReps((r) => Math.max(1, r - 1))} onPlus={() => setReps((r) => r + 1)} />
        <WeightStepper value={kg} onChange={setKg} />
      </View>
      <T variant="caption">
        {before}
        {oneRm ? ` · 1RM estimado ${formatDecimal(oneRm)} kg` : ''}
      </T>
      {error ? <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold }}>{error}</T> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Excluir" variant="danger" onPress={remove} disabled={pending} style={{ flex: 1, height: 54 }} />
        <Button title="Salvar" onPress={save} loading={pending} style={{ flex: 1, height: 54 }} />
      </View>
    </Sheet>
  );
}

// Peso com +/- 2,5 kg e campo editável no meio.
export function WeightStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(formatDecimal(value, 2));
  useEffect(() => {
    setText(value ? formatDecimal(value, 2) : '0');
  }, [value]);
  return (
    <View style={[s.stepper, { borderColor: colors.accent }]}>
      <Text style={s.stepperLabel}>Peso (kg)</Text>
      <View style={s.stepperControls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Menos peso" onPress={() => onChange(Math.max(0, value - 2.5))} style={s.stepBtn} hitSlop={4}>
          <Icon name="minus" size={18} strokeWidth={2.2} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          onEndEditing={() => onChange(Math.max(0, parseNumber(text) ?? 0))}
          keyboardType="decimal-pad"
          selectionColor={colors.accent}
          accessibilityLabel="Peso em quilos"
          style={[s.stepValue, { width: 56, padding: 0 }]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Mais peso" onPress={() => onChange(value + 2.5)} style={s.stepBtn} hitSlop={4}>
          <Icon name="plus" size={18} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

export function setLabel(set: { reps: number; weightKg: number | null }) {
  return set.weightKg ? `${formatDecimal(set.weightKg)} kg × ${set.reps}` : `${set.reps} reps`;
}

export function volumeOf(sets: { reps: number; weightKg: number | null }[]) {
  return sets.reduce((sum, x) => sum + x.reps * (x.weightKg ?? 0), 0);
}

export function plural(n: number, one: string, many: string) {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}

const s = StyleSheet.create({
  thumb: { backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  streakPill: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radius.icon,
    backgroundColor: STREAK.bg,
    borderWidth: 1,
    borderColor: STREAK.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakText: { fontFamily: fonts.title, fontSize: 15, color: STREAK.text },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingRight: 10,
    paddingLeft: 16,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stepperLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.icon,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { minWidth: 36, textAlign: 'center', fontFamily: fonts.title, fontSize: 18, color: colors.text },
  segment: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segmentText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSoft },
  optionGrid: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    height: 48,
    borderRadius: radius.icon,
    borderWidth: 1,
    borderColor: colors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { fontFamily: fonts.bold, fontSize: 14, color: colors.textSoft },
  toggleChip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleChipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSoft },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBox: { width: 52, height: 56, borderRadius: radius.icon, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  dateWeek: { fontFamily: fonts.extrabold, fontSize: 10, color: colors.textMuted },
  dateDay: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
  rowTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  xp: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.accent },
  shortcut: {
    flex: 1,
    height: 48,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shortcutText: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: {
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderInput,
    gap: 18,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 99, backgroundColor: colors.borderDashed },
  sheetTitle: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
  select: {
    height: 50,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  selectOption: { minHeight: 48, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
});
