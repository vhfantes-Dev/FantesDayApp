import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { activityApi } from '@/api/endpoints';
import type { Activity } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { isImported, kindOf } from '@/components/rotina/activityTypes';
import { Card, EmptyState, ErrorBanner, Fab, Header, Screen, SkeletonList, T, Tag } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { addDays, formatNumber, parseIsoDate, today } from '@/utils/format';

const WEEKDAY = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

interface Group {
  title: string;
  showDate: boolean;
  items: Activity[];
}

function groupActivities(list: Activity[], todayIso: string): Group[] {
  const yesterday = addDays(todayIso, -1);
  const weekStart = addDays(todayIso, -6);
  const sorted = [...list].sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
  const groups: Group[] = [];
  for (const a of sorted) {
    let title: string;
    let showDate = true;
    if (a.date >= todayIso) {
      title = a.date === todayIso ? 'HOJE' : 'PRÓXIMOS DIAS';
      showDate = a.date !== todayIso;
    } else if (a.date === yesterday) {
      title = 'ONTEM';
      showDate = false;
    } else if (a.date >= weekStart) {
      title = 'ESTA SEMANA';
    } else {
      const d = parseIsoDate(a.date);
      title = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    }
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.items.push(a);
    else groups.push({ title, showDate, items: [a] });
  }
  return groups;
}

export default function AtividadesScreen() {
  const userId = useUserId();
  const insets = useSafeAreaInsets();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => activityApi.list(userId), [userId]);
  const todayIso = today();
  const weekStart = addDays(todayIso, -6);

  const week = (data ?? []).filter((a) => a.date >= weekStart && a.date <= todayIso);
  const minutes = week.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
  const kcal = week.reduce((s, a) => s + (a.caloriesBurned ?? 0), 0);
  const xp = week.reduce((s, a) => s + (a.xpEarned ?? 0), 0);
  const groups = data ? groupActivities(data, todayIso) : [];

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      contentStyle={{ paddingBottom: insets.bottom + 110 }}
      overlay={<Fab title="Nova atividade" onPress={() => router.push('/atividades/nova')} bottom={insets.bottom + 24} />}
    >
      <Header title="Atividades" />

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={4} /> : null}

      {data ? (
        <>
          <View style={styles.stats}>
            <StatBox value={String(week.length)} label="na semana" />
            <StatBox value={formatNumber(minutes)} label="minutos" />
            <StatBox value={formatNumber(kcal)} label="kcal gastas" />
          </View>
          {xp > 0 ? (
            <View style={styles.xpRow}>
              <Icon name="bolt" size={16} color={colors.accent} />
              <T variant="caption" color={colors.textSoft}>
                +{formatNumber(xp)} XP com atividades nos últimos 7 dias
              </T>
            </View>
          ) : null}

          {data.length === 0 ? (
            <EmptyState
              icon="pulse"
              title="Nenhuma atividade ainda"
              message="Registre corridas, caminhadas e pedaladas. Cada 2 minutos rendem 1 XP."
              action="Registrar atividade"
              onAction={() => router.push('/atividades/nova')}
            />
          ) : (
            groups.map((g) => (
              <View key={g.title} style={{ gap: 10 }}>
                <Text style={styles.groupTitle}>{g.title}</Text>
                {g.items.map((a) => (
                  <ActivityRow key={a.id} activity={a} showDate={g.showDate} />
                ))}
              </View>
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <T variant="caption" style={{ fontSize: 11 }}>{label}</T>
    </View>
  );
}

function ActivityRow({ activity, showDate }: { activity: Activity; showDate: boolean }) {
  const kind = kindOf(activity.activityType);
  const d = parseIsoDate(activity.date);
  const parts = [
    showDate ? `${WEEKDAY[d.getDay()]}, ${d.getDate()}` : null,
    activity.durationMinutes ? `${activity.durationMinutes} min` : null,
    activity.caloriesBurned ? `${formatNumber(activity.caloriesBurned)} kcal` : null,
  ].filter(Boolean);
  const imported = isImported(activity);
  return (
    <Card
      padded={false}
      style={styles.row}
      onPress={() => router.push({ pathname: '/atividades/nova', params: { id: String(activity.id) } })}
    >
      <View style={[styles.iconBox, { backgroundColor: kind.bg }]}>
        <Icon name={kind.icon} size={22} color={kind.color} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 14 }} numberOfLines={1}>{activity.activityType}</T>
        <T variant="caption">{parts.join(' · ') || 'Sem duração'}</T>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Tag label={imported ? 'Importada' : 'Manual'} tone={imported ? 'info' : 'neutral'} />
        <Text style={styles.xp}>+{activity.xpEarned ?? 0} XP</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  statValue: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6 },
  groupTitle: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.7, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  xp: { fontFamily: fonts.extrabold, fontSize: 11, color: colors.accent },
});
