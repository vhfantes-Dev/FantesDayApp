// Estado local do treino em andamento (a API não guarda início/fim nem o descanso planejado).
// Fica em memória enquanto o app está aberto.
import type { StartedWorkout } from '@/api/types';

interface LiveSession {
  startedAt: number;
  finishedAt?: number;
  // workoutExerciseId → descanso / metas vindos da rotina
  rest: Record<number, number>;
  targets: Record<number, { sets: number | null; reps: string | null }>;
}

const sessions = new Map<number, LiveSession>();

export function registerStartedWorkout(started: StartedWorkout) {
  const rest: LiveSession['rest'] = {};
  const targets: LiveSession['targets'] = {};
  for (const e of started.exercises) {
    if (e.restSeconds) rest[e.workoutExerciseId] = e.restSeconds;
    targets[e.workoutExerciseId] = { sets: e.targetSets, reps: e.targetReps };
  }
  sessions.set(started.workout.id, { startedAt: Date.now(), rest, targets });
}

export function getSession(workoutId: number): LiveSession {
  let s = sessions.get(workoutId);
  if (!s) {
    s = { startedAt: Date.now(), rest: {}, targets: {} };
    sessions.set(workoutId, s);
  }
  return s;
}

export function peekSession(workoutId: number) {
  return sessions.get(workoutId);
}

export function finishSession(workoutId: number) {
  const s = sessions.get(workoutId);
  if (s && !s.finishedAt) s.finishedAt = Date.now();
}

export function forgetSession(workoutId: number) {
  sessions.delete(workoutId);
}
