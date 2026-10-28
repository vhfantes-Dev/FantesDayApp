import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius } from '@/theme';
import { parseIsoDate, toIsoDate } from '@/utils/format';
import { Icon } from './Icon';
import { Button, T } from './ui';

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// "26 de setembro de 2026"
function displayDate(iso: string) {
  const d = parseIsoDate(iso);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

interface DateFieldProps {
  label?: string;
  // Data no formato da API ("yyyy-MM-dd") ou null quando vazia.
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  error?: string | null;
  hint?: string;
  minimumDate?: string;
  maximumDate?: string;
  // Mostra um "x" para limpar a data (campos opcionais).
  clearable?: boolean;
  // Data inicial do calendário quando o campo está vazio (padrão: hoje).
  initialDate?: string;
  style?: StyleProp<ViewStyle>;
}

// Campo de data que abre o calendário do sistema (Android: diálogo; iOS: folha com calendário; web: seletor do navegador).
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Escolher data',
  error,
  hint,
  minimumDate,
  maximumDate,
  clearable,
  initialDate,
  style,
}: DateFieldProps) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(new Date());
  const insets = useSafeAreaInsets();

  const start = value ?? initialDate ?? toIsoDate(new Date());
  const min = minimumDate ? parseIsoDate(minimumDate) : undefined;
  const max = maximumDate ? parseIsoDate(maximumDate) : undefined;

  function open() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parseIsoDate(start),
        mode: 'date',
        minimumDate: min,
        maximumDate: max,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toIsoDate(date));
        },
      });
      return;
    }
    setDraft(parseIsoDate(start));
    setIosOpen(true);
  }

  const box = (
    <View style={[styles.box, iosOpen && { borderColor: colors.accent }, !!error && { borderColor: colors.danger }]}>
      <Icon name="calendar" size={20} color={value ? colors.accent : colors.textMuted} />
      <Text style={[styles.text, !value && { color: colors.textDone }]} numberOfLines={1}>
        {value ? displayDate(value) : placeholder}
      </Text>
      {clearable && value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Limpar data" hitSlop={10} onPress={() => onChange(null)}>
          <Icon name="close" size={18} color={colors.textMuted} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={[{ gap: 8 }, style]}>
      {label ? <T variant="label">{label}</T> : null}

      {Platform.OS === 'web' ? (
        // No navegador, um <input type="date"> invisível por cima do campo abre o calendário nativo.
        <View>
          {box}
          {createElement('input', {
            type: 'date',
            value: value ?? '',
            min: minimumDate,
            max: maximumDate,
            'aria-label': label ?? placeholder,
            onChange: (e: { target: { value: string } }) => onChange(e.target.value || null),
            onClick: (e: { currentTarget: { showPicker?: () => void } }) => e.currentTarget.showPicker?.(),
            style: { position: 'absolute', inset: 0, width: clearable && value ? 'calc(100% - 48px)' : '100%', height: '100%', opacity: 0, cursor: 'pointer', colorScheme: 'dark' },
          })}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label ?? 'Data'}: ${value ? displayDate(value) : 'não definida'}`}
          accessibilityHint="Abre o calendário"
          onPress={open}
        >
          {box}
        </Pressable>
      )}

      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert" size={14} color={colors.danger} strokeWidth={2} />
          <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold, flex: 1 }}>{error}</T>
        </View>
      ) : hint ? (
        <T variant="caption">{hint}</T>
      ) : null}

      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={styles.backdrop} accessibilityLabel="Fechar calendário" onPress={() => setIosOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            {label ? <T variant="section" style={{ textAlign: 'center' }}>{label}</T> : null}
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              locale="pt-BR"
              themeVariant="dark"
              accentColor={colors.accent}
              textColor={colors.text}
              minimumDate={min}
              maximumDate={max}
              onChange={(_, date) => date && setDraft(date)}
            />
            <Button
              title="Confirmar"
              onPress={() => {
                onChange(toIsoDate(draft));
                setIosOpen(false);
              }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 54,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 15 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderDashed },
});
