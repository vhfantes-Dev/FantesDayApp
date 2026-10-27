import { addDays, parseIsoDate, today } from '@/utils/format';

// Semana de segunda a domingo (regra do ranking semanal da API).
export function currentWeek() {
  const t = today();
  const dow = parseIsoDate(t).getDay(); // 0 = domingo
  const monday = addDays(t, dow === 0 ? -6 : 1 - dow);
  return { monday, sunday: addDays(monday, 6) };
}
