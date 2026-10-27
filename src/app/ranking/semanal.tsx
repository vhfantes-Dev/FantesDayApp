import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { strengthApi } from '@/api/endpoints';
import type { WeeklyLeaderboardEntry } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { RankingTabs } from '@/components/rank/RankingTabs';
import { PLACE_BG, PLACE_BORDER, PLACE_COLORS, shortName } from '@/components/rank/names';
import { currentWeek } from '@/components/rank/week';
import { EmptyState, ErrorBanner, Header, ProgressBar, Screen, SkeletonList, T } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { addDays, formatNumber, parseIsoDate, shortDate } from '@/utils/format';

function weekLabel(monday: string, sunday: string) {
  const a = parseIsoDate(monday);
  const b = parseIsoDate(sunday);
  return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${shortDate(sunday)}` : `${shortDate(monday)} – ${shortDate(sunday)}`;
}

function timeLeft(sunday: string) {
  const end = parseIsoDate(addDays(sunday, 1)).getTime();
  const mins = Math.max(0, Math.floor((end - Date.now()) / 60_000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return d > 0 ? `${d}d ${String(h).padStart(2, '0')}h` : `${h}h ${String(m).padStart(2, '0')}min`;
}

export default function RankingSemanalScreen() {
  const userId = useUserId();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => strengthApi.weekly(50), []);
  const { monday, sunday } = currentWeek();

  const top = data?.[0]?.volumeKg ?? 0;
  const me = data?.find((e) => e.userId === userId) ?? null;
  const ahead = me ? data?.find((e) => e.position === me.position - 1) ?? null : null;
  const missing = me && ahead ? Math.max(1, Math.ceil(ahead.volumeKg - me.volumeKg)) : null;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Ranking" />
      <RankingTabs active="semanal" />

      <View style={styles.week}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.weekTitle}>Semana {weekLabel(monday, sunday)}</Text>
          <Text style={styles.weekSub}>Soma de reps × carga de todas as séries</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={styles.countdown}>{timeLeft(sunday)}</Text>
          <Text style={styles.weekSub}>para fechar</Text>
        </View>
      </View>

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={5} /> : null}

      {data && data.length === 0 ? (
        <EmptyState
          icon="podium"
          title="Ninguém treinou nesta semana"
          message="Registre séries com carga para sair na frente. O ranking fecha domingo."
          action="Começar treino"
          onAction={() => router.push('/treinos/novo')}
        />
      ) : null}

      {data && data.length > 0 ? (
        <>
          <View style={{ gap: 8 }}>
            {data.map((e) => (
              <WeeklyRow key={e.userId} entry={e} top={top} me={e.userId === userId} />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/treinos/novo')}
            style={({ pressed }) => [styles.tip, pressed && { opacity: 0.85 }]}
          >
            <Icon name="trendUp" size={22} color={colors.accent} />
            <Text style={styles.tipText}>
              {!me ? (
                'Registre um treino com carga para entrar no ranking da semana.'
              ) : me.position === 1 ? (
                'Você está no topo da semana! Mais um treino ajuda a segurar a liderança.'
              ) : (
                <>
                  Mais <Text style={styles.tipBold}>{formatNumber(missing)} kg</Text> te levam ao {me.position - 1}º. Um treino de pernas costuma render isso.
                </>
              )}
            </Text>
          </Pressable>

          <T variant="caption" style={{ textAlign: 'center' }}>
            {me ? `${me.workouts} treino${me.workouts === 1 ? '' : 's'} nesta semana · ` : ''}o ranking fecha domingo
          </T>
        </>
      ) : null}
    </Screen>
  );
}

function WeeklyRow({ entry, top, me }: { entry: WeeklyLeaderboardEntry; top: number; me: boolean }) {
  const podium = entry.position <= 3;
  const placeColor = podium ? PLACE_COLORS[entry.position - 1] : null;
  const first = entry.position === 1;
  const barColor = me ? colors.accent : placeColor ?? colors.textDone;
  return (
    <View
      style={[styles.row, first && { backgroundColor: PLACE_BG, borderColor: PLACE_BORDER }, me && { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}
      accessibilityLabel={`${entry.position}º, ${me ? 'você' : entry.name}, ${formatNumber(entry.volumeKg)} quilos, ${entry.workouts} treinos`}
    >
      <View style={styles.rowTop}>
        {placeColor ? (
          <View style={[styles.place, { backgroundColor: placeColor }]}>
            <Text style={styles.placeText}>{entry.position}</Text>
          </View>
        ) : (
          <Text style={[styles.pos, me && { color: colors.accent }]}>{entry.position}</Text>
        )}
        <Text style={[styles.name, (me || first) && { fontFamily: fonts.extrabold }]} numberOfLines={1}>
          {me ? 'Você' : shortName(entry.name)}
        </Text>
        <Text style={[styles.meta, me && { color: colors.textLabel }]}>
          {entry.workouts} treino{entry.workouts === 1 ? '' : 's'}
        </Text>
        <Text style={styles.volume}>{formatNumber(entry.volumeKg)} kg</Text>
      </View>
      <ProgressBar
        value={top ? (entry.volumeKg / top) * 100 : 0}
        color={barColor}
        height={6}
        track={me ? '#2A3A1A' : first ? '#3A3218' : colors.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  week: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.proteinSoft,
    borderWidth: 1,
    borderColor: '#26345A',
  },
  weekTitle: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  weekSub: { fontFamily: fonts.regular, fontSize: 12, color: '#A9B8DA' },
  countdown: { fontFamily: fonts.title, fontSize: 15, color: colors.protein },
  row: {
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  place: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  placeText: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.onAccent },
  pos: { width: 26, textAlign: 'center', fontFamily: fonts.extrabold, fontSize: 13, color: colors.textMuted },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  volume: { minWidth: 76, textAlign: 'right', fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
  },
  tipText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.textSoft },
  tipBold: { fontFamily: fonts.extrabold, color: colors.text },
});
