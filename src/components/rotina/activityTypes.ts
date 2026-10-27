import type { Activity } from '@/api/types';
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

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

export function kindOf(activityType: string): ActivityKind {
  const n = normalize(activityType);
  return ACTIVITY_KINDS.find((k) => normalize(k.label) === n) ?? { ...OTHER_KIND, label: activityType };
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
