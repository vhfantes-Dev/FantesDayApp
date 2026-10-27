import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { workoutApi } from '@/api/endpoints';
import type { Workout } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { EmptyState, ErrorBanner, Fab, Header, Screen, SkeletonList, T } from '@/components/ui';
import { sortWorkouts } from '@/components/workouts/labels';
import { WorkoutRow } from '@/components/workouts/parts';
import { useApi } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';
import { addDays, formatNumber, parseIsoDate, relativeDate, today } from '@/utils/format';

const MONTHS = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

export default function HistoricoTreinosScreen() {
  const userId = useUserId();
  const { data, error, loading, refreshing, refresh, reload } = useApi(async () => sortWorkouts(await workoutApi.list(userId)), [userId]);

  const t = today();
  const monday = addDays(t, -((parseIsoDate(t).getDay() + 6) % 7));
  const thisWeek = (data ?? []).filter((w) => w.date >= monday && w.date <= addDays(monday, 6));
  const weekXp = thisWeek.reduce((sum, w) => sum + (w.xpEarned ?? 0), 0);
  const groups = groupByMonth(data ?? []);

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      overlay={<Fab title="Novo treino" onPress={() => router.push('/treinos/novo')} bottom={32} />}
      contentStyle={{ gap: 16, paddingBottom: 120 }}
    >
      <Header title="Histórico de treinos" />

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={5} /> : null}

      {data ? (
        <>
          <View style={styles.summary}>
            <View style={styles.tile}>
              <Text style={styles.tileValue}>{thisWeek.length}</Text>
              <T variant="caption">{thisWeek.length === 1 ? 'treino nesta semana' : 'treinos nesta semana'}</T>
            </View>
            <View style={[styles.tile, styles.tileAccent]}>
              <Text style={[styles.tileValue, { color: colors.accent }]}>+{formatNumber(weekXp)}</Text>
              <T variant="caption" color={colors.textLabel}>XP ganho nesta semana</T>
            </View>
          </View>

          {data.length === 0 ? (
            <EmptyState
              icon="history"
              title="Nenhum treino ainda"
              message="Seus treinos aparecem aqui, agrupados por mês."
              action="Novo treino"
              onAction={() => router.push('/treinos/novo')}
            />
          ) : (
            groups.map((g) => (
              <View key={g.key} style={{ gap: 10 }}>
                <Text style={styles.month}>{g.label}</Text>
                {g.items.map((w) => (
                  <WorkoutRow
                    key={w.id}
                    workout={w}
                    subtitle={`${relativeDate(w.date)}${w.date >= monday ? ' · esta semana' : ''}`}
                    faded={w.date < addDays(t, -30)}
                    onPress={() => router.push({ pathname: '/treinos/resumo/[id]', params: { id: String(w.id) } })}
                  />
                ))}
              </View>
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}

function groupByMonth(list: Workout[]) {
  const currentYear = new Date().getFullYear();
  const map = new Map<string, { key: string; label: string; items: Workout[] }>();
  for (const w of list) {
    const d = parseIsoDate(w.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map.has(key)) {
      const label = d.getFullYear() === currentYear ? MONTHS[d.getMonth()] : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      map.set(key, { key, label, items: [] });
    }
    map.get(key)!.items.push(w);
  }
  return Array.from(map.values());
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, padding: 16, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 4 },
  tileAccent: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder },
  tileValue: { fontFamily: fonts.title, fontSize: 22, color: colors.text },
  month: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.7, color: colors.textMuted },
});
