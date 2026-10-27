import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { strengthApi } from '@/api/endpoints';
import type { ExerciseRank, MuscleRank, StrengthProfile } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { RankLadder } from '@/components/rank/RankLadder';
import { Glow } from '@/components/rank/motion';
import {
  Card,
  EmptyState,
  ErrorBanner,
  Header,
  IconButton,
  ListRow,
  ProgressBar,
  RankBadge,
  Screen,
  SkeletonList,
  T,
} from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { formatDecimal } from '@/utils/format';
import { rankProgress, RANKS } from '@/utils/ranks';

export default function RankScreen() {
  const userId = useUserId();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => strengthApi.profile(userId), [userId]);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header
        title="Rank de força"
        right={<IconButton icon="podium" label="Ranking" onPress={() => router.push('/ranking')} />}
      />

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={4} /> : null}

      {data ? <Content profile={data} /> : null}
    </Screen>
  );
}

function Content({ profile }: { profile: StrengthProfile }) {
  if (profile.bodyweightKg == null || profile.sex == null) {
    return (
      <>
        <EmptyState
          icon="scale"
          title="Complete seu perfil"
          message="O rank de força compara suas cargas com o seu peso corporal e sexo. Informe os dois no perfil para calcular sua nota."
          action="Editar perfil"
          onAction={() => router.push('/perfil/editar')}
        />
        <Links />
      </>
    );
  }

  const overall = profile.overall;
  if (!overall) {
    return (
      <>
        <EmptyState
          icon="dumbbell"
          title="Registre séries em exercícios com rank"
          message="Sua nota aparece assim que você registrar uma série em um dos exercícios da lista de ranks."
          action="Ver exercícios com rank"
          onAction={() => router.push('/rank/exercicios')}
        />
        <RankLadder current={null} />
        <Links />
      </>
    );
  }

  const info = RANKS[overall.rank];
  const progress = rankProgress(overall.rank, overall.lp);
  const muscles = [...profile.muscles].sort((a, b) => b.rank.score - a.rank.score);
  const best = profile.exercises.reduce<ExerciseRank | null>((acc, e) => (!acc || e.rank.score > acc.rank.score ? e : acc), null);
  const lpToNext = overall.nextRank ? Math.max(0, 100 - overall.lp) : null;

  return (
    <>
      <View style={styles.hero}>
        <View style={styles.badgeWrap}>
          <Glow color={info.color} size={170} style={{ left: -30, top: -29 }} />
          <RankBadge rank={overall.rank} size={106} />
        </View>
        <Text style={[styles.rankName, { color: info.color }]}>{info.label}</Text>
        <T variant="caption" style={{ fontSize: 13, textAlign: 'center' }}>
          Nota {overall.score} de 1000 · base: {formatDecimal(profile.bodyweightKg)} kg, {profile.sex === 'MALE' ? 'masculino' : 'feminino'}
        </T>
        <View style={{ alignSelf: 'stretch', gap: 6, marginTop: 4 }}>
          <ProgressBar value={progress} color={info.color} height={10} />
          <View style={styles.between}>
            <Text style={[styles.lp, { color: info.color }]}>{overall.lp} LP</Text>
            <Text style={[styles.lp, { color: colors.textMuted }]}>
              {overall.nextRank ? `${RANKS[overall.nextRank].label} em ${lpToNext} LP` : 'Rank máximo'}
            </Text>
          </View>
        </View>
      </View>

      <RankLadder current={overall.rank} />

      {muscles.length > 0 ? (
        <View style={{ gap: 10 }}>
          <T variant="overline">POR GRUPO MUSCULAR</T>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {muscles.map((m, i) => (
              <MuscleRow key={m.muscleGroup} muscle={m} last={i === muscles.length - 1} />
            ))}
          </Card>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <View style={styles.between}>
          <T variant="overline">MELHOR EXERCÍCIO</T>
          <Pressable accessibilityRole="button" hitSlop={10} style={{ paddingVertical: 8 }} onPress={() => router.push('/rank/exercicios')}>
            <Text style={styles.link}>Todos os exercícios</Text>
          </Pressable>
        </View>
        {best ? (
          <Card
            onPress={() => router.push({ pathname: '/exercicios/historico/[id]', params: { id: String(best.exerciseId) } })}
            style={styles.bestCard}
          >
            <RankBadge rank={best.rank.rank} size={36} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.bestName} numberOfLines={2}>{best.exerciseName}</Text>
              <T variant="caption">
                1RM {formatDecimal(best.bestOneRepMax)} kg
                {best.bodyweightRatio != null ? ` · ${formatDecimal(best.bodyweightRatio, 2)}× seu peso` : ''} · {RANKS[best.rank.rank].label} {best.rank.score}
              </T>
            </View>
            <Icon name="chevronRight" size={18} color={colors.textMuted} strokeWidth={2} />
          </Card>
        ) : null}
      </View>

      <Links />
    </>
  );
}

function MuscleRow({ muscle, last }: { muscle: MuscleRank; last: boolean }) {
  const info = RANKS[muscle.rank.rank];
  return (
    <View
      style={[styles.muscleRow, !last && styles.rowBorder]}
      accessibilityLabel={`${muscle.muscleGroup}: ${info.label}, nota ${muscle.rank.score}`}
    >
      <RankBadge rank={muscle.rank.rank} size={29} />
      <Text style={styles.muscleName} numberOfLines={1}>{muscle.muscleGroup}</Text>
      <View style={{ flex: 1 }}>
        <ProgressBar value={muscle.rank.score / 10} color={info.color} height={6} />
      </View>
      <Text style={styles.score}>{muscle.rank.score}</Text>
    </View>
  );
}

function Links() {
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <ListRow icon="body" title="Recuperação muscular" subtitle="Mapa do corpo pelos últimos 7 dias" onPress={() => router.push('/rank/mapa')} />
      <ListRow icon="dumbbell" title="Ranks por exercício" onPress={() => router.push('/rank/exercicios')} />
      <ListRow icon="trophy" title="Os 9 ranks" onPress={() => router.push('/rank/selos')} />
      <ListRow icon="podium" title="Ranking entre usuários" onPress={() => router.push('/ranking')} last />
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8 },
  badgeWrap: { width: 110, height: 112, alignItems: 'center', justifyContent: 'center' },
  rankName: { fontFamily: fonts.display, fontSize: 28 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lp: { fontFamily: fonts.bold, fontSize: 12 },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  muscleName: { width: 84, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  score: { width: 34, textAlign: 'right', fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  bestCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  bestName: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.text },
});
