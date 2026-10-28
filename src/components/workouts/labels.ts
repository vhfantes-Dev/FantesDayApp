// Rótulos em pt-BR para os campos do catálogo de exercícios (o free-exercise-db guarda em inglês).
import type { CatalogSource, Workout } from '@/api/types';
import { EQUIPMENT_LABELS } from '@/utils/ranks';

// O catálogo agora vem em português; os mapas abaixo só traduzem valores antigos em inglês.
const EQUIPMENT_EN: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Halteres',
  machine: 'Máquina',
  cable: 'Polia',
  'body only': 'Peso corporal',
  kettlebells: 'Kettlebell',
  bands: 'Elástico',
  'medicine ball': 'Medicine ball',
  'exercise ball': 'Bola suíça',
  'foam roll': 'Rolo de espuma',
  'e-z curl bar': 'Barra W',
  other: 'Outro',
};

// Opções do cadastro de exercício (valores gravados como a API usa).
export const EQUIPMENT_OPTIONS = [
  'Máquina', 'Barra', 'Halteres', 'Polia', 'Peso corporal', 'Kettlebell', 'Elástico', 'Barra W', 'Barra fixa',
  'Banco', 'Medicine ball', 'Bola suíça', 'Rolo de espuma', 'Colchonete', 'Outro',
];

const LEVEL_EN: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  expert: 'Avançado',
  advanced: 'Avançado',
};

export const LEVEL_OPTIONS = ['Iniciante', 'Intermediário', 'Avançado'];

const CATEGORY_EN: Record<string, string> = {
  strength: 'Força',
  stretching: 'Alongamento',
  plyometrics: 'Pliometria',
  powerlifting: 'Powerlifting',
  'olympic weightlifting': 'Levantamento olímpico',
  strongman: 'Strongman',
  cardio: 'Cardio',
};

export const DEFAULT_CATEGORY = 'Força';

export function equipmentLabel(raw: string | null | undefined) {
  if (!raw) return '';
  return EQUIPMENT_EN[raw.toLowerCase()] ?? EQUIPMENT_LABELS[raw.toUpperCase()] ?? raw;
}

export function levelLabel(raw: string | null | undefined) {
  if (!raw) return '';
  return LEVEL_EN[raw.toLowerCase()] ?? raw;
}

export function levelTone(raw: string | null | undefined): 'accent' | 'warn' | 'pink' | 'neutral' {
  switch (levelLabel(raw)) {
    case 'Iniciante':
      return 'accent';
    case 'Intermediário':
      return 'warn';
    case 'Avançado':
      return 'pink';
    default:
      return 'neutral';
  }
}

export function categoryLabel(raw: string | null | undefined) {
  if (!raw) return '';
  return CATEGORY_EN[raw.toLowerCase()] ?? raw;
}

export function sourceLabel(source: CatalogSource) {
  switch (source) {
    case 'CUSTOM':
      return 'Personalizado';
    case 'WGER':
      return 'wger';
    case 'FREE_EXERCISE_DB':
      return 'free-exercise-db';
    default:
      return 'Catálogo';
  }
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

// Converte o createdAt da API em milissegundos (ou null se não der para confiar).
export function parseTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}
