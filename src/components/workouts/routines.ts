// Regras do gerador de rotinas (espelham o README da API) e leitura das rotinas geradas.
import type { Routine, TrainingGoal, TrainingLevel, Workout } from '@/api/types';
import { GOAL_LABELS, LEVEL_LABELS } from '@/utils/ranks';

export const GOAL_SCHEME: Record<TrainingGoal, { sets: number; reps: string; rest: string }> = {
  STRENGTH: { sets: 4, reps: '3-6', rest: '3 min' },
  HYPERTROPHY: { sets: 3, reps: '8-12', rest: '90 s' },
  ENDURANCE: { sets: 3, reps: '15-20', rest: '45 s' },
};

export const EXERCISES_PER_DAY: Record<TrainingLevel, number> = { BEGINNER: 4, INTERMEDIATE: 5, ADVANCED: 6 };

export function splitLabel(days: number, level: TrainingLevel) {
  if (days <= 2) return 'Full Body';
  if (days === 3) return level === 'BEGINNER' ? 'Full Body' : 'Push / Pull / Legs';
  if (days === 4) return 'Superiores / Inferiores';
  if (days === 5) return 'PPL + Superiores / Inferiores';
  return 'Push / Pull / Legs ×2';
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface RoutineMeta {
  letter: string;
  title: string;
  subtitle: string;
  generated: boolean;
  goal: string | null;
  level: string | null;
  exercises: number;
  sets: number;
  minutes: number;
}

// "Treino A - Push - Peito, Ombros e Tríceps" → letra A, título "Push", subtítulo "Peito, Ombros e Tríceps".
export function routineMeta(routine: Routine, index: number): RoutineMeta {
  const m = routine.name.match(/^Treino\s+([A-Z])\s*[-·]\s*(.+)$/i);
  let letter = LETTERS[index % LETTERS.length];
  let title = routine.name;
  let subtitle = '';
  if (m) {
    letter = m[1].toUpperCase();
    const parts = m[2].split(/\s+-\s+/);
    title = parts[0];
    subtitle = parts.slice(1).join(' · ');
  }
  if (!subtitle) {
    subtitle = Array.from(new Set(routine.exercises.map((e) => e.muscleGroup).filter(Boolean))).slice(0, 3).join(', ');
  }
  const n = routine.notes?.match(/^Gerada automaticamente \(objetivo (\w+), nivel (\w+)\)/i);
  const sets = routine.exercises.reduce((sum, e) => sum + (e.targetSets ?? 3), 0);
  // Estimativa: 1 min por série + descanso, e 2 min de troca por exercício; arredonda para 5 min.
  const seconds = routine.exercises.reduce((sum, e) => sum + (e.targetSets ?? 3) * (60 + (e.restSeconds ?? 90)) + 120, 0);
  return {
    letter,
    title,
    subtitle,
    generated: !!n || routine.id === null,
    goal: n ? GOAL_LABELS[n[1].toUpperCase()] ?? null : null,
    level: n ? LEVEL_LABELS[n[2].toUpperCase()] ?? null : null,
    exercises: routine.exercises.length,
    sets,
    minutes: Math.max(5, Math.round(seconds / 300) * 5),
  };
}

// Próxima rotina: a seguinte à última usada (pelo nome do treino), ou a primeira.
export function nextRoutine(routines: Routine[], workouts: Workout[]) {
  const usable = routines.filter((r) => r.id && r.exercises.length > 0);
  if (!usable.length) return null;
  const sorted = [...workouts].sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
  for (const w of sorted) {
    const idx = usable.findIndex((r) => r.name === w.workoutType);
    if (idx >= 0) return usable[(idx + 1) % usable.length];
  }
  return usable[0];
}

// Sugestões geradas sem salvar (id null) ficam aqui para a tela de prévia.
interface Preview {
  routines: Routine[];
  goal: TrainingGoal;
  level: TrainingLevel;
}

let preview: Preview | null = null;

export function setGeneratedPreview(p: Preview) {
  preview = p;
}

export function getGeneratedPreview() {
  return preview;
}

// Marca uma sugestão como salva (troca pela rotina criada).
export function replacePreviewRoutine(index: number, saved: Routine) {
  if (!preview) return;
  preview = { ...preview, routines: preview.routines.map((r, i) => (i === index ? saved : r)) };
}
