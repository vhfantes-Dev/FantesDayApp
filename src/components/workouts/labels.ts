// Rótulos em pt-BR para os campos do catálogo de exercícios (o free-exercise-db guarda em inglês).
import type { CatalogSource, Workout } from '@/api/types';
import { EQUIPMENT_LABELS } from '@/utils/ranks';

const EQUIPMENT: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Halteres',
  machine: 'Máquina',
  cable: 'Cabo',
  'body only': 'Peso corporal',
  kettlebells: 'Kettlebell',
  bands: 'Elásticos',
  'medicine ball': 'Medicine ball',
  'exercise ball': 'Bola suíça',
  'foam roll': 'Rolo',
  'e-z curl bar': 'Barra W',
  other: 'Outro',
};

// Opções do cadastro de exercício (valor gravado = chave em inglês, como no catálogo).
export const EQUIPMENT_OPTIONS = ['machine', 'barbell', 'dumbbell', 'cable', 'body only', 'kettlebells', 'bands', 'other'];

const LEVEL: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  expert: 'Avançado',
  advanced: 'Avançado',
};

export const LEVEL_OPTIONS = ['beginner', 'intermediate', 'expert'];

const CATEGORY: Record<string, string> = {
  strength: 'Força',
  stretching: 'Alongamento',
  plyometrics: 'Pliometria',
  powerlifting: 'Powerlifting',
  'olympic weightlifting': 'Levantamento olímpico',
  strongman: 'Strongman',
  cardio: 'Cardio',
};

export function equipmentLabel(raw: string | null | undefined) {
  if (!raw) return '';
  return EQUIPMENT[raw.toLowerCase()] ?? EQUIPMENT_LABELS[raw.toUpperCase()] ?? raw;
}

export function levelLabel(raw: string | null | undefined) {
  if (!raw) return '';
  return LEVEL[raw.toLowerCase()] ?? raw;
}

export function levelTone(raw: string | null | undefined): 'accent' | 'warn' | 'pink' | 'neutral' {
  switch (raw?.toLowerCase()) {
    case 'beginner':
      return 'accent';
    case 'intermediate':
      return 'warn';
    case 'expert':
    case 'advanced':
      return 'pink';
    default:
      return 'neutral';
  }
}

export function categoryLabel(raw: string | null | undefined) {
  if (!raw) return '';
  return CATEGORY[raw.toLowerCase()] ?? raw;
}

export function sourceLabel(source: CatalogSource) {
  return source === 'CUSTOM' ? 'Personalizado' : 'Catálogo';
}

// 1RM estimado (Epley), igual ao da API: carga × (1 + reps / 30); acima de 20 reps não estima.
export function epley(reps: number, kg: number | null | undefined) {
  if (!kg || reps <= 0 || reps > 20) return null;
  return kg * (1 + reps / 30);
}

// Mais recentes primeiro.
export function sortWorkouts(list: Workout[]) {
  return [...list].sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
}

// "01:05" ou "1:02:05"
export function clock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Data "dd/mm/aaaa" → "aaaa-mm-dd" (ou undefined se inválida).
export function parseBrDate(text: string): string | undefined {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return undefined;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return undefined;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function formatBrDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Converte o createdAt da API em milissegundos (ou null se não der para confiar).
export function parseTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}
