// Formatação em pt-BR e utilitários de data (as datas da API são "yyyy-MM-dd" no fuso local).

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WEEKDAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const WEEK_CODES = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const;

export function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today() {
  return toIsoDate(new Date());
}

export function parseIsoDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number) {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

// "Sábado, 26 de setembro"
export function longDate(iso: string) {
  const d = parseIsoDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

// "26 set"
export function shortDate(iso: string) {
  const d = parseIsoDate(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

// "Hoje", "Ontem" ou "26 set"
export function relativeDate(iso: string) {
  const t = today();
  if (iso === t) return 'Hoje';
  if (iso === addDays(t, -1)) return 'Ontem';
  return shortDate(iso);
}

export function weekdayShort(iso: string) {
  return WEEKDAYS_SHORT[parseIsoDate(iso).getDay()];
}

// "08:00:00" → "08:00"
export function hhmm(time: string | null | undefined) {
  return time ? time.slice(0, 5) : '';
}

export function formatNumber(n: number | null | undefined, decimals = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Número com até `max` casas, sem zeros sobrando: 79.5 → "79,5", 80 → "80"
export function formatDecimal(n: number | null | undefined, max = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: max });
}

// Converte o texto de um campo ("79,5") em número, ou undefined se vazio/inválido.
export function parseNumber(text: string): number | undefined {
  const clean = text.replace(/\s/g, '').replace(',', '.');
  if (!clean) return undefined;
  const n = Number(clean);
  return Number.isFinite(n) ? n : undefined;
}

export function initials(name: string | null | undefined) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function firstName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] ?? '';
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function percent(value: number | null | undefined, total: number | null | undefined) {
  if (!value || !total) return 0;
  return clamp((value / total) * 100, 0, 100);
}

// "SEG,QUA,SEX" → "SEG, QUA, SEX" (ou "Todo dia" quando são os 7)
export function weekDaysLabel(weekDays: string | null | undefined) {
  if (!weekDays) return '';
  const days = weekDays.split(',').map((d) => d.trim()).filter(Boolean);
  if (days.length === 7) return 'Todo dia';
  return days.join(', ');
}
