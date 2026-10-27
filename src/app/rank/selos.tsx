import { router } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { strengthApi } from '@/api/endpoints';
import type { StrengthRank } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Glow } from '@/components/rank/motion';
import { Card, ErrorBanner, Header, RankBadge, Screen, SkeletonList, T } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { RANK_ORDER, RANKS } from '@/utils/ranks';

const DESCRIPTIONS: Record<StrengthRank, string> = {
  BRONZE: 'Primeiros treinos',
  SILVER: 'Iniciante',
  GOLD: 'Novato',
  PLATINUM: 'Rumo ao intermediário',
  DIAMOND: 'Intermediário',
  MASTER: 'Forte de verdade',
  GRANDMASTER: 'Avançado',
  CHALLENGER: 'Quase elite',
  OLYMPIAN: 'Elite',
};

function range(rank: StrengthRank) {
  const min = RANKS[rank].min;
  return rank === 'OLYMPIAN' ? `${min} – 1000` : `${min} – ${min + 99}`;
}

export default function SelosScreen() {
  const userId = useUserId();
  const { width } = useWindowDimensions();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => strengthApi.profile(userId), [userId]);
  const overall = data?.overall ?? null;
  const currentIdx = overall ? RANK_ORDER.indexOf(overall.rank) : -1;
  const cellWidth = Math.floor((width - 40 - 20) / 3);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header title="Os 9 ranks" />

      <View style={{ gap: 6 }}>
        <T variant="overline">RANK DE FORÇA · NOTA 0–1000</T>
        <T variant="caption" style={{ fontSize: 13, lineHeight: 20 }}>
          Cada rank cobre 100 pontos (LP). Com 100 LP você sobe. O Olímpico vai de 800 a 1000.
        </T>
      </View>

      {error && !data ? <ErrorBanner message={`Não foi possível carregar seu rank. ${error.message}`} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={1} /> : null}

      <View style={styles.grid}>
        {RANK_ORDER.map((r, i) => {
          const info = RANKS[r];
          const isCurrent = i === currentIdx;
          const locked = i > currentIdx;
          const missing = locked && overall ? info.min - overall.score : null;
          return (
            <View
              key={r}
              style={[styles.cell, { width: cellWidth }, isCurrent && { borderColor: info.color, borderWidth: 2 }]}
              accessibilityLabel={`${info.label}, nota ${range(r)}${isCurrent ? ', seu rank atual' : locked ? ', bloqueado' : ''}`}
            >
              {!locked ? <Glow color={info.color} size={110} style={{ top: 2, left: (cellWidth - 2 - 110) / 2 }} /> : null}
              <RankBadge rank={r} size={Math.min(72, cellWidth - 24)} locked={locked} />
              <Text style={[styles.name, { color: locked ? colors.textMuted : info.color }]} numberOfLines={1} adjustsFontSizeToFit>
                {info.label}
              </Text>
              <Text style={styles.range}>{range(r)}</Text>
              <Text style={styles.desc} numberOfLines={2}>
                {missing != null ? `Faltam ${missing} pts` : DESCRIPTIONS[r]}
              </Text>
              {isCurrent ? (
                <View style={[styles.youTag, { backgroundColor: info.color }]}>
                  <Text style={styles.youText}>VOCÊ</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {data && !overall ? (
        <Card style={{ gap: 6 }} onPress={() => router.push('/rank/exercicios')}>
          <T style={{ fontFamily: fonts.extrabold, fontSize: 14 }}>Você ainda não tem rank</T>
          <T variant="caption" style={{ fontSize: 13, lineHeight: 20 }}>
            Registre uma série em um exercício com rank para receber sua primeira nota.
          </T>
        </Card>
      ) : null}

      <Card style={{ gap: 12 }}>
        <T style={{ fontFamily: fonts.extrabold, fontSize: 14 }}>Rank bloqueado</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <RankBadge rank={null} size={56} locked />
          <T variant="caption" style={{ flex: 1, fontSize: 13, lineHeight: 20 }}>
            Ranks acima do seu aparecem escurecidos, com cadeado, e mostram quantos pontos faltam.
          </T>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 6,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  name: { fontFamily: fonts.display, fontSize: 12 },
  range: { fontFamily: fonts.bold, fontSize: 11, color: colors.text },
  desc: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, color: colors.textMuted, textAlign: 'center' },
  youTag: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 },
  youText: { fontFamily: fonts.extrabold, fontSize: 9, color: colors.onAccent },
});
