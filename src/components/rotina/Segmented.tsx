import { Pressable, StyleSheet, Text, View } from 'react-native';

import { T } from '@/components/ui';
import { colors, fonts, radius } from '@/theme';
import { DAY_CODES, DAY_LABEL, type DayCode } from './dates';

// Controle segmentado (Hábito / Única, Manual / Importada).
export function Segmented<V extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      {label ? <T variant="label">{label}</T> : null}
      <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(o.value)}
              style={[styles.segmentItem, active && { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Seletor dos dias da semana (DOM … SÁB).
export function WeekdayPicker({
  label = 'Repetir em',
  value,
  onChange,
  error,
}: {
  label?: string;
  value: DayCode[];
  onChange: (days: DayCode[]) => void;
  error?: string | null;
}) {
  function toggle(day: DayCode) {
    const next = value.includes(day) ? value.filter((d) => d !== day) : [...value, day];
    onChange(DAY_CODES.filter((d) => next.includes(d)));
  }
  return (
    <View style={{ gap: 10 }}>
      <T variant="label">{label}</T>
      <View style={styles.days}>
        {DAY_CODES.map((d) => {
          const active = value.includes(d);
          return (
            <Pressable
              key={d}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={DAY_LABEL[d]}
              onPress={() => toggle(d)}
              style={[styles.day, active && { backgroundColor: colors.accent, borderColor: colors.accent }]}
            >
              <Text style={[styles.dayText, active && { color: colors.onAccent, fontFamily: fonts.extrabold }]}>{DAY_LABEL[d]}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold }}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSoft },
  segmentTextActive: { fontFamily: fonts.extrabold, color: colors.onAccent },
  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    height: 46,
    borderRadius: radius.icon,
    borderWidth: 1,
    borderColor: colors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontFamily: fonts.bold, fontSize: 11, color: colors.textSoft },
});
