import type { ActivityLevel, Sex } from '@/api/types';
import { colors } from '@/theme';

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string; factor: number }[] = [
  { value: 'SEDENTARY', label: 'Sedentário', description: 'Pouco ou nenhum exercício', factor: 1.2 },
  { value: 'LIGHT', label: 'Leve', description: 'Exercício 1 a 3 dias por semana', factor: 1.375 },
  { value: 'MODERATE', label: 'Moderado', description: 'Exercício 3 a 5 dias por semana', factor: 1.55 },
  { value: 'ACTIVE', label: 'Ativo', description: 'Intenso 6 a 7 dias por semana', factor: 1.725 },
  { value: 'VERY_ACTIVE', label: 'Muito ativo', description: 'Intenso diário ou trabalho físico', factor: 1.9 },
];

export function activityLevelInfo(level: ActivityLevel | null | undefined) {
  return ACTIVITY_LEVELS.find((l) => l.value === level) ?? null;
}

export const SEX_LABELS: Record<Sex, string> = { MALE: 'Masculino', FEMALE: 'Feminino' };

// Nomes dos campos que a API devolve em missingFields.
export const MISSING_FIELD_LABELS: Record<string, string> = {
  bodyweightKg: 'Peso',
  heightCm: 'Altura',
  birthDate: 'Data de nascimento',
  sex: 'Sexo',
  activityLevel: 'Nível de atividade',
};

// "×1,55"
export function factorLabel(factor: number) {
  return `×${factor.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}`;
}

// Cor da faixa do IMC (mesmas faixas do medidor).
export function bmiColor(bmi: number) {
  if (bmi < 18.5) return colors.protein;
  if (bmi < 25) return colors.accent;
  if (bmi < 30) return colors.carbs;
  return '#FF6B5A';
}

// Idade a partir de "yyyy-MM-dd".
export function ageFrom(iso: string, todayIso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const [ty, tm, td] = todayIso.split('-').map(Number);
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age -= 1;
  return age;
}
