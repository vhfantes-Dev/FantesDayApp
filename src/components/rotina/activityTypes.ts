import type { Activity, KnownActivity } from '@/api/types';
import type { IconName } from '@/components/Icon';
import { colors } from '@/theme';

export interface ActivityKind {
  label: string;
  icon: IconName;
  color: string;
  bg: string;
}

// Tipos sugeridos no formulário. O tipo é salvo como texto, então qualquer outro nome cai em "Outra".
export const ACTIVITY_KINDS: ActivityKind[] = [
  { label: 'Corrida', icon: 'run', color: colors.protein, bg: colors.proteinSoft },
  { label: 'Caminhada', icon: 'pulse', color: colors.carbs, bg: colors.carbsSoft },
  { label: 'Ciclismo', icon: 'bike', color: colors.accent, bg: colors.accentSoft },
  { label: 'Natação', icon: 'swim', color: colors.fat, bg: colors.fatSoft },
  { label: 'Musculação', icon: 'dumbbell', color: colors.water, bg: colors.proteinSoft },
];

export const OTHER_KIND: ActivityKind = { label: 'Outra', icon: 'more', color: colors.textSoft, bg: colors.surface2 };

export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

// Ícone de outras atividades do catálogo parecidas com as comuns.
const SIMILAR: { match: RegExp; base: string }[] = [
  { match: /trote|esteira/, base: 'Corrida' },
  { match: /caminhada|trilha|escada/, base: 'Caminhada' },
  { match: /bicicleta|spinning|bike/, base: 'Ciclismo' },
  { match: /hidro|remo|surf|paddle/, base: 'Natação' },
  { match: /crossfit|funcional|hiit|eliptico/, base: 'Musculação' },
];

export function kindOf(activityType: string): ActivityKind {
  const n = normalize(activityType);
  const exact = ACTIVITY_KINDS.find((k) => normalize(k.label) === n);
  if (exact) return exact;
  const similar = SIMILAR.find((s) => s.match.test(n));
  const base = similar && ACTIVITY_KINDS.find((k) => k.label === similar.base);
  return base ? { ...base, label: activityType } : { ...OTHER_KIND, label: activityType };
}

// Atividade do catálogo da API com o mesmo nome (sem diferenciar acento ou maiúscula).
export function findKnown(catalog: KnownActivity[] | undefined, activityType: string) {
  const n = normalize(activityType);
  if (!n || !catalog) return undefined;
  return catalog.find((k) => normalize(k.name) === n);
}

// kcal = MET × peso × horas (mesma fórmula da API)
export function estimateKcal(met: number, weightKg: number, minutes: number) {
  return Math.round(met * weightKg * (minutes / 60));
}

export function isKnownKind(activityType: string) {
  const n = normalize(activityType);
  return ACTIVITY_KINDS.some((k) => normalize(k.label) === n);
}

// Atividade trazida de outro app (Apple Saúde, Google Fit…) ou marcada como importada.
export function isImported(a: Pick<Activity, 'origin' | 'importSource' | 'externalId'>) {
  if (a.importSource || a.externalId) return true;
  return !!a.origin && normalize(a.origin) !== 'manual';
}

// Regra da API: 1 XP a cada 2 minutos, no máximo 60 por atividade.
export function activityXp(minutes: number | undefined | null) {
  if (!minutes || minutes <= 0) return 0;
  return Math.min(60, Math.floor(minutes / 2));
}
