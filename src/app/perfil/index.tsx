import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { goalApi, trackingApi, userApi, workoutApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { UserPhoto, useDeleteAccount } from '@/components/conta/UserPhoto';
import { useToast } from '@/components/Toast';
import { Card, Chip, ErrorBanner, Header, IconButton, ListRow, Ring, Screen, Section, SkeletonList, T, Toggle } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { formatDecimal, formatNumber, parseIsoDate } from '@/utils/format';

const CATEGORIES = ['Saúde', 'Hipertrofia', 'Emagrecimento', 'Produtividade'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export default function PerfilScreen() {
  // Sem useUserId: esta tela continua montada por um instante depois de sair da conta.
  const { user, signOut, biometricAvailable, setBiometricEnabled } = useAuth();
  const userId = user?.id ?? 0;
  const toast = useToast();
  const deleteAccount = useDeleteAccount();
  const [bioPending, setBioPending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const { data, error, loading, refreshing, refresh, reload, setData } = useApi(
    async () => {
      const [progress, weights, goals, workouts] = await Promise.all([
        userApi.progress(userId),
        trackingApi.weights(userId).catch(() => null),
        goalApi.get(userId).catch(() => null),
        workoutApi.list(userId).then((w) => w.length).catch(() => null),
      ]);
      return { progress, weights, goals, workouts };
    },
    [userId],
    { enabled: !!user },
  );

  if (!user) return null;

  const progress = data?.progress;
  const inLevel = progress ? progress.totalXp % 100 : 0;
  const weight = data?.weights?.currentWeightKg ?? user.bodyweightKg;
  const since = user.createdAt ? parseIsoDate(user.createdAt.slice(0, 10)) : null;

  async function changeCategory(category: string) {
    if (!progress) return;
    const previous = progress.category;
    const next = previous === category ? '' : category;
    setData((d) => ({ ...d!, progress: { ...d!.progress, category: next || null } }));
    try {
      const updated = await userApi.updateCategory(userId, next);
      setData((d) => ({ ...d!, progress: updated }));
    } catch (e) {
      setData((d) => ({ ...d!, progress: { ...d!.progress, category: previous } }));
      toast.error(e instanceof Error ? e.message : 'Não foi possível mudar a categoria.');
    }
  }

  async function toggleBiometric(enabled: boolean) {
    setBioPending(true);
    try {
      await setBiometricEnabled(enabled);
      toast.success(enabled ? 'Face ID ativado' : 'Face ID desativado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível mudar o Face ID.');
    } finally {
      setBioPending(false);
    }
  }

  function confirmSignOut() {
    Alert.alert('Sair da conta?', 'Você vai precisar entrar de novo com e-mail e senha.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
        },
      },
    ]);
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Header
        title="Perfil"
        right={<IconButton icon="edit" label="Editar perfil" onPress={() => router.push('/perfil/editar')} />}
      />

      <View style={styles.hero}>
        <View style={{ width: 112, height: 112 }}>
          <Ring value={inLevel} size={112} stroke={6}>
            <UserPhoto user={user} size={88} borderRadius={44} />
          </Ring>
          {progress ? (
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Nível {progress.level}</Text>
            </View>
          ) : null}
        </View>
        <T variant="title" style={{ fontSize: 22, marginTop: 8, textAlign: 'center' }}>{user.name}</T>
        <T variant="caption" style={{ fontSize: 13, textAlign: 'center' }}>
          {user.email}
          {since ? ` · desde ${MONTHS_SHORT[since.getMonth()]} ${since.getFullYear()}` : ''}
        </T>
      </View>

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={1} /> : null}

      {progress ? (
        <View style={styles.stats}>
          <StatBox value={formatNumber(progress.totalXp)} label="XP total" />
          <StatBox value={String(100 - inLevel)} label={`XP p/ nível ${progress.level + 1}`} />
          <StatBox
            value={data?.workouts === null || data?.workouts === undefined ? '–' : formatNumber(data.workouts)}
            label={data?.workouts === 1 ? 'treino' : 'treinos'}
            onPress={() => router.push('/treinos/historico')}
          />
        </View>
      ) : null}

      {progress ? (
        <Section>
          <T variant="overline" style={{ fontFamily: fonts.bold, fontSize: 13 }}>CATEGORIA</T>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip key={c} label={c} tone="accent" active={progress.category === c} onPress={() => changeCategory(c)} />
            ))}
          </View>
        </Section>
      ) : null}

      <Card padded={false} style={styles.list}>
        {biometricAvailable ? (
          <ListRow
            icon="faceId"
            iconColor={colors.accent}
            title="Face ID"
            subtitle="Entrar sem digitar a senha"
            right={
              bioPending ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Toggle value={!!user.faceIdEnabled} onChange={toggleBiometric} label="Face ID" />
              )
            }
          />
        ) : null}
        <ListRow
          icon="flame"
          iconColor={colors.carbs}
          title="Metabolismo e metas"
          value={data?.goals?.dailyCalories ? `${formatNumber(data.goals.dailyCalories)} kcal` : undefined}
          onPress={() => router.push('/metabolismo')}
        />
        <ListRow
          icon="scale"
          iconColor={colors.protein}
          title="Peso corporal"
          value={weight ? `${formatDecimal(weight)} kg` : undefined}
          onPress={() => router.push('/peso')}
        />
        <ListRow icon="user" title="Editar perfil" subtitle="Nome, corpo, metas e foto" onPress={() => router.push('/perfil/editar')} />
        <ListRow icon="trophy" title="Rank de força" onPress={() => router.push('/rank')} />
        <ListRow icon="podium" title="Ranking" onPress={() => router.push('/ranking')} />
        <ListRow icon="pulse" title="Atividades" onPress={() => router.push('/atividades')} />
        <ListRow icon="history" title="Histórico de treinos" onPress={() => router.push('/treinos/historico')} />
        <ListRow icon="lock" title="Alterar senha" onPress={() => router.push('/perfil/senha')} />
        <ListRow
          icon="logout"
          title={signingOut ? 'Saindo…' : 'Sair'}
          danger
          last
          onPress={signingOut ? undefined : confirmSignOut}
        />
      </Card>

      <Card padded={false} style={[styles.list, { borderColor: colors.dangerBorder }]}>
        <ListRow
          icon="trash"
          title={deleteAccount.deleting ? 'Excluindo…' : 'Excluir conta'}
          subtitle="Apaga todos os seus dados"
          danger
          last
          onPress={deleteAccount.deleting ? undefined : deleteAccount.confirm}
        />
      </Card>
    </Screen>
  );
}

function StatBox({ value, unit, label, onPress }: { value: string; unit?: string; label: string; onPress?: () => void }) {
  return (
    <Card style={styles.stat} onPress={onPress} padded={false}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <T variant="caption" style={{ fontSize: 11, textAlign: 'center' }} numberOfLines={1}>{label}</T>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, paddingTop: 6 },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  levelBadgeText: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.onAccent },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 14, borderRadius: 18, alignItems: 'center', gap: 4 },
  statValue: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
  statUnit: { fontSize: 12, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { borderRadius: 22, overflow: 'hidden' },
});
