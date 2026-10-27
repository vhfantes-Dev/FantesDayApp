// Leitura de atividades do Apple Saúde / Google Fit.
//
// Este build (Expo Go, sem módulos nativos extras) NÃO consegue ler os apps de saúde: isso exige
// um development build com uma biblioteca nativa (ex: react-native-health no iOS,
// react-native-health-connect no Android). Para ligar a leitura depois, implemente `isAvailable`
// e `read` de cada fonte abaixo; o resto (tela, envio em lote, XP sem duplicar) já funciona.

import { Platform } from 'react-native';

import { activityApi } from '@/api/endpoints';
import type { ActivityImportRequest, ActivityImportResult } from '@/api/types';

export type HealthSourceId = 'APPLE_HEALTH' | 'GOOGLE_FIT';

// Uma atividade lida do app de saúde, já no formato da API.
export interface HealthActivity {
  // Id estável vindo do app de saúde: a API ignora o que já foi importado com o mesmo externalId.
  externalId: string;
  activityType: string; // "Corrida", "Caminhada"… (use os nomes de ACTIVITY_KINDS quando der)
  durationMinutes: number;
  caloriesBurned?: number;
  date: string; // yyyy-MM-dd
}

export interface HealthAvailability {
  available: boolean;
  // Explicação para o usuário quando não está disponível.
  reason?: string;
}

export interface HealthSource {
  id: HealthSourceId;
  label: string;
  platform: 'ios' | 'android';
  isAvailable: () => Promise<HealthAvailability>;
  // Atividades a partir de `since` (yyyy-MM-dd), inclusive.
  read: (since: string) => Promise<HealthActivity[]>;
}

const NOT_IN_BUILD =
  'Esta versão do app não inclui o acesso nativo aos dados de saúde. A importação funciona em um build próprio do app (development build).';

function unavailable(platform: 'ios' | 'android', label: string): () => Promise<HealthAvailability> {
  return async () => {
    if (Platform.OS !== platform) {
      return { available: false, reason: `${label} só está disponível em aparelhos ${platform === 'ios' ? 'iPhone' : 'Android'}.` };
    }
    return { available: false, reason: NOT_IN_BUILD };
  };
}

export const HEALTH_SOURCES: Record<HealthSourceId, HealthSource> = {
  APPLE_HEALTH: {
    id: 'APPLE_HEALTH',
    label: 'Apple Saúde',
    platform: 'ios',
    isAvailable: unavailable('ios', 'Apple Saúde'),
    read: async () => {
      throw new Error(NOT_IN_BUILD);
    },
  },
  GOOGLE_FIT: {
    id: 'GOOGLE_FIT',
    label: 'Google Fit',
    platform: 'android',
    isAvailable: unavailable('android', 'Google Fit'),
    read: async () => {
      throw new Error(NOT_IN_BUILD);
    },
  },
};

export const DEFAULT_SOURCE: HealthSourceId = Platform.OS === 'android' ? 'GOOGLE_FIT' : 'APPLE_HEALTH';

// A API aceita lotes limitados; envia em partes e soma os resultados.
const BATCH_SIZE = 100;

// Lê do app de saúde e envia para a API. Atividades repetidas (mesmo externalId) são ignoradas pela API.
export async function syncHealthActivities(
  userId: number,
  sourceId: HealthSourceId,
  since: string,
): Promise<ActivityImportResult> {
  const source = HEALTH_SOURCES[sourceId];
  const activities = (await source.read(since)).filter((a) => a.externalId && a.durationMinutes > 0);
  return importActivities(userId, sourceId, activities);
}

export async function importActivities(
  userId: number,
  sourceId: HealthSourceId,
  activities: HealthActivity[],
): Promise<ActivityImportResult> {
  const total: ActivityImportResult = { imported: 0, skipped: 0, xpEarned: 0, activities: [] };
  // A API recusa lote vazio ("Nenhuma atividade para importar").
  if (!activities.length) return total;
  for (let i = 0; i < activities.length; i += BATCH_SIZE) {
    const body: ActivityImportRequest = { source: sourceId, activities: activities.slice(i, i + BATCH_SIZE) };
    const r = await activityApi.importBatch(userId, body);
    total.imported += r.imported;
    total.skipped += r.skipped;
    total.xpEarned += r.xpEarned;
    total.activities.push(...r.activities);
  }
  return total;
}
