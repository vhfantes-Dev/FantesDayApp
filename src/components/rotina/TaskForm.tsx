import { StyleSheet, View } from 'react-native';

import type { Task, TaskRequest } from '@/api/types';
import { Icon } from '@/components/Icon';
import { Field, T } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { hhmm } from '@/utils/format';
import { brToIso, daysPhrase, isoToBr, maskDate, maskTime, parseDays, timeToApi, type DayCode } from './dates';
import { Segmented, WeekdayPicker } from './Segmented';

export type TaskKind = 'habit' | 'once';

export interface TaskFormState {
  title: string;
  kind: TaskKind;
  date: string; // dd/mm/aaaa
  time: string; // HH:mm
  days: DayCode[];
}

export type TaskFormErrors = Partial<Record<'title' | 'date' | 'time' | 'days', string>>;

export const emptyTaskForm: TaskFormState = { title: '', kind: 'habit', date: '', time: '', days: [] };

export function taskToForm(task: Task): TaskFormState {
  return {
    title: task.title,
    kind: task.recurring ? 'habit' : 'once',
    date: isoToBr(task.date),
    time: hhmm(task.time),
    days: parseDays(task.weekDays),
  };
}

// Valida e monta o corpo da requisição. `editing` envia weekDays "" para virar avulsa.
export function buildTaskRequest(
  form: TaskFormState,
  editing: boolean,
): { request?: TaskRequest; errors: TaskFormErrors } {
  const errors: TaskFormErrors = {};
  const title = form.title.trim();
  if (!title) errors.title = 'Dê um nome para a tarefa.';
  else if (title.length > 120) errors.title = 'Use no máximo 120 caracteres.';

  let date: string | undefined;
  if (form.date.trim()) {
    const iso = brToIso(form.date);
    if (!iso) errors.date = 'Data inválida. Use dd/mm/aaaa.';
    else date = iso;
  }

  let time: string | undefined;
  if (form.time.trim()) {
    const t = timeToApi(form.time);
    if (!t) errors.time = 'Horário inválido. Use HH:mm (ex: 08:00).';
    else time = t;
  }

  if (form.kind === 'habit' && form.days.length === 0) errors.days = 'Escolha pelo menos um dia para repetir.';

  if (Object.keys(errors).length) return { errors };

  const request: TaskRequest = {
    title,
    type: form.kind === 'habit' ? 'Hábito' : 'Única',
    date,
    time,
    weekDays: form.kind === 'habit' ? form.days.join(',') : editing ? '' : undefined,
  };
  return { request, errors };
}

export function TaskFormFields({
  form,
  onChange,
  errors,
  autoFocus,
}: {
  form: TaskFormState;
  onChange: (patch: Partial<TaskFormState>) => void;
  errors: TaskFormErrors;
  autoFocus?: boolean;
}) {
  const time = timeToApi(form.time) ? form.time : '';
  let summary: string;
  if (form.kind === 'habit') {
    summary = form.days.length
      ? `Repete ${daysPhrase(form.days)}${time ? ` às ${time}` : ''}`
      : 'Escolha os dias em que o hábito se repete.';
  } else {
    const iso = brToIso(form.date);
    summary = iso
      ? `Só em ${form.date}${time ? ` às ${time}` : ''}`
      : 'Sem data, aparece todo dia até ser concluída.';
  }

  return (
    <View style={{ gap: 22 }}>
      <Field
        label="Título"
        value={form.title}
        onChangeText={(title) => onChange({ title })}
        placeholder="Ex: Beber 2L de água"
        autoFocus={autoFocus}
        maxLength={120}
        returnKeyType="done"
        error={errors.title}
      />

      <Segmented
        label="Tipo"
        value={form.kind}
        onChange={(kind) => onChange({ kind })}
        options={[
          { value: 'habit', label: 'Hábito' },
          { value: 'once', label: 'Única' },
        ]}
      />

      <View style={styles.row}>
        <Field
          style={{ flex: 1 }}
          label={form.kind === 'habit' ? 'Início' : 'Data'}
          value={form.date}
          onChangeText={(t) => onChange({ date: maskDate(t) })}
          placeholder="dd/mm/aaaa"
          keyboardType="number-pad"
          maxLength={10}
          error={errors.date}
        />
        <Field
          style={{ flex: 1 }}
          label="Horário"
          value={form.time}
          onChangeText={(t) => onChange({ time: maskTime(t) })}
          placeholder="08:00"
          keyboardType="number-pad"
          maxLength={5}
          error={errors.time}
        />
      </View>

      {form.kind === 'habit' ? (
        <WeekdayPicker value={form.days} onChange={(days) => onChange({ days })} error={errors.days} />
      ) : null}

      <View style={styles.summary}>
        <Icon name={form.kind === 'habit' ? 'bell' : 'calendar'} size={20} color={colors.accent} />
        <T style={styles.summaryText}>{summary}</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.textSoft },
});
