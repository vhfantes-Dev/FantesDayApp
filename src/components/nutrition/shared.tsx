import { useEffect, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CatalogSource, MealItem, MealNutrition } from '@/api/types';
import { Icon } from '@/components/Icon';
import { Tag, T } from '@/components/ui';
import { colors, fonts, radius } from '@/theme';
import { formatNumber } from '@/utils/format';

// ---------- Utilitários ----------

export function sumItems(items: MealItem[]): MealNutrition {
  return items.reduce(
    (acc, i) => ({
      calories: acc.calories + (i.calculatedCalories ?? 0),
      protein: acc.protein + (i.calculatedProtein ?? 0),
      carbs: acc.carbs + (i.calculatedCarbs ?? 0),
      fat: acc.fat + (i.calculatedFat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

const SOURCE_TAGS: Record<CatalogSource, { label: string; tone: 'info' | 'warn' | 'neutral' }> = {
  TACO: { label: 'TACO', tone: 'info' },
  OPEN_FOOD_FACTS: { label: 'OPEN FOOD FACTS', tone: 'warn' },
  CUSTOM: { label: 'MANUAL', tone: 'neutral' },
  FREE_EXERCISE_DB: { label: 'CATÁLOGO', tone: 'neutral' },
};

export function SourceTag({ source }: { source: CatalogSource }) {
  const t = SOURCE_TAGS[source] ?? SOURCE_TAGS.CUSTOM;
  return <Tag label={t.label} tone={t.tone} />;
}

// "P 10,8 g   C 37,5 g   G 8,1 g"
export function MacroInline({
  protein,
  carbs,
  fat,
  unit = ' g',
  size = 11,
  gap = 12,
  prefix,
}: {
  protein: number | null | undefined;
  carbs: number | null | undefined;
  fat: number | null | undefined;
  unit?: string;
  size?: number;
  gap?: number;
  prefix?: ReactNode;
}) {
  const text = { fontFamily: fonts.bold, fontSize: size };
  return (
    <View style={{ flexDirection: 'row', gap, flexWrap: 'wrap', alignItems: 'center' }}>
      {prefix}
      <Text style={[text, { color: colors.protein }]}>P {formatNumber(protein ?? 0, 1)}{unit}</Text>
      <Text style={[text, { color: colors.carbs }]}>C {formatNumber(carbs ?? 0, 1)}{unit}</Text>
      <Text style={[text, { color: colors.fat }]}>G {formatNumber(fat ?? 0, 1)}{unit}</Text>
    </View>
  );
}

// ---------- Controle segmentado ----------

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  tone = 'light',
  label,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  tone?: 'light' | 'accent';
  label?: string;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[
              styles.segment,
              active && { backgroundColor: tone === 'accent' ? colors.accent : colors.text },
            ]}
          >
            <Text style={[styles.segmentText, active && { color: colors.onAccent, fontFamily: fonts.extrabold }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Quantidade ----------

export const QUICK_PORTIONS = [50, 100, 150, 200];

export function QuantityStepper({
  value,
  onChange,
  unit = 'g',
  step = 10,
}: {
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
}) {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Diminuir quantidade"
          onPress={() => onChange(Math.max(step, Math.round((value - step) / step) * step || step))}
          style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.7 }]}
        >
          <Icon name="minus" size={20} color={colors.text} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.qtyCenter}>
          <TextInput
            value={value ? String(value) : ''}
            onChangeText={(t) => {
              const n = Number(t.replace(/[^\d]/g, ''));
              onChange(Number.isFinite(n) ? Math.min(n, 5000) : 0);
            }}
            keyboardType="number-pad"
            selectionColor={colors.accent}
            accessibilityLabel="Quantidade em gramas"
            style={styles.qtyInput}
            maxLength={4}
          />
          <Text style={styles.qtyUnit}>{unit}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Aumentar quantidade"
          onPress={() => onChange(Math.min(5000, Math.round((value + step) / step) * step))}
          style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.7 }]}
        >
          <Icon name="plus" size={20} color={colors.text} strokeWidth={2.4} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel="Porções rápidas">
        {QUICK_PORTIONS.map((p) => {
          const active = value === p;
          return (
            <Pressable
              key={p}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(p)}
              style={[styles.portion, active && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}
            >
              <Text style={[styles.portionText, active && { color: colors.accent, fontFamily: fonts.extrabold }]}>{p} {unit}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------- Folha inferior ----------

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" accessibilityRole="button" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.grabber} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T variant="section">{title}</T>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} hitSlop={8} style={styles.sheetClose}>
              <Icon name="close" size={18} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Campo numérico com rótulo colorido ----------

export function NumberField({
  label,
  labelColor = colors.textMuted,
  error,
  style,
  ...input
}: TextInputProps & { label: string; labelColor?: string; error?: string | null; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: labelColor }}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textDone}
        selectionColor={colors.accent}
        keyboardType="decimal-pad"
        accessibilityLabel={label}
        {...input}
        style={[styles.numInput, !!error && { borderColor: colors.danger }]}
      />
      {error ? <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold }}>{error}</T> : null}
    </View>
  );
}

// Executa `fn` depois de `ms` sem mudanças em `value`.
export function useDebouncedEffect(fn: () => void, deps: unknown[], ms = 350) {
  useEffect(() => {
    const t = setTimeout(fn, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSoft },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyCenter: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
  qtyInput: { fontFamily: fonts.title, fontSize: 36, color: colors.text, minWidth: 60, textAlign: 'center', padding: 0 },
  qtyUnit: { fontFamily: fonts.bold, fontSize: 16, color: colors.textMuted },
  portion: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSoft },
  backdrop: { flex: 1, backgroundColor: 'rgba(5,6,8,0.7)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderDashed },
  sheetClose: {
    width: 44,
    height: 44,
    borderRadius: radius.icon,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numInput: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface2,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
});
