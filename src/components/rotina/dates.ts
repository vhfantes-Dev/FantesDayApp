// Helpers dos formulários de tarefas e atividades: máscaras de data/hora e dias da semana.
import { parseIsoDate } from '@/utils/format';

// Ordem de exibição (domingo primeiro, como no design) e códigos aceitos pela API.
export const DAY_CODES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const;
export type DayCode = (typeof DAY_CODES)[number];

export const DAY_LABEL: Record<DayCode, string> = {
  DOM: 'DOM',
  SEG: 'SEG',
  TER: 'TER',
  QUA: 'QUA',
  QUI: 'QUI',
  SEX: 'SEX',
  SAB: 'SÁB',
};

const DAY_NAME: Record<DayCode, string> = {
  DOM: 'domingo',
  SEG: 'segunda',
  TER: 'terça',
  QUA: 'quarta',
  QUI: 'quinta',
  SEX: 'sexta',
  SAB: 'sábado',
};

// "SEG,QUA,SEX" → ['SEG','QUA','SEX'] (na ordem de exibição)
export function parseDays(weekDays: string | null | undefined): DayCode[] {
  if (!weekDays) return [];
  const set = new Set(
    weekDays
      .split(',')
      .map((d) => d.trim().toUpperCase().replace('Á', 'A'))
      .filter(Boolean),
  );
  return DAY_CODES.filter((d) => set.has(d));
}

// Etiqueta curta para os cartões: "Todos os dias", "Seg a sex" ou "SEG · QUA · SEX"
export function daysTag(weekDays: string | null | undefined) {
  const days = parseDays(weekDays);
  if (days.length === 7) return 'Todos os dias';
  if (days.length === 5 && !days.includes('SAB') && !days.includes('DOM')) return 'Seg a sex';
  return days.map((d) => DAY_LABEL[d]).join(' · ');
}

// Frase para o resumo: "toda segunda, quarta e sexta"
export function daysPhrase(days: DayCode[]) {
  if (days.length === 7) return 'todos os dias';
  if (!days.length) return '';
  const names = days.map((d) => DAY_NAME[d]);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
  const weekendOnly = days.every((d) => d === 'SAB' || d === 'DOM');
  return `${weekendOnly && days.length === 1 ? 'todo' : 'toda'} ${list}`;
}

// "2026-09-26" → "26/09/2026"
export function isoToBr(iso: string | null | undefined) {
  if (!iso) return '';
  const d = parseIsoDate(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Máscara "0800" → "08:00"
export function maskTime(text: string) {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

// "08:00" → "08:00:00" (null se inválido)
export function timeToApi(text: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
}

// "2026-09-26T16:40:12" → "16:40"
export function timeOfDateTime(value: string | null | undefined) {
  if (!value) return '';
  const m = /T(\d{2}:\d{2})/.exec(value);
  return m ? m[1] : '';
}
