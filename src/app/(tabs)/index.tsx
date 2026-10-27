import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { absoluteUrl } from '@/api/client';
import { taskApi, userApi } from '@/api/endpoints';
import type { Dashboard, Task } from '@/api/types';
import { useAuth, useUserId } from '@/auth/AuthContext';
import { Icon, type IconName } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import {
  Avatar,
  Card,
  Checkbox,
  EmptyState,
  ErrorBanner,
  ProgressBar,
  RankBadge,
  Ring,
  Screen,
  Section,
  SkeletonList,
  T,
  Tag,
} from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { firstName, formatNumber, hhmm, longDate, today, weekDaysLabel } from '@/utils/format';
import { rankLabel } from '@/utils/ranks';

export default function HojeScreen() {
  const userId = useUserId();
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, loading, refreshing, refresh, reload, setData } = useApi(() => userApi.dashboard(userId), [userId]);

  async function toggleTask(task: Task) {
    const previousLevel = data?.progress.level ?? 0;
    // Atualiza na hora; desfaz se a API recusar.
    setData((d) => patchTask(d!, task.id, !task.completed));
    try {
      if (task.completed) await taskApi.uncomplete(task.id);
      else await taskApi.complete(task.id);
      if (!task.completed) toast.success(`${task.title} · +10 XP`);
      const fresh = await userApi.dashboard(userId);
      setData(fresh);
      if (fresh.progress.level > previousLevel && previousLevel > 0) {
        router.push({ pathname: '/celebracao/nivel', params: { level: String(fresh.progress.level), xp: String(fresh.progress.totalXp) } });
      }
    } catch (e) {
      setData((d) => patchTask(d!, task.id, task.completed));
      toast.error(e instanceof Error ? e.message : 'Não foi possível atualizar a tarefa.');
    }
  }

  const name = data?.user.name ?? user?.name ?? '';

  return (
    <Screen withTabBar refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <View style={{ gap: 4, flex: 1 }}>
          <T variant="label" color={colors.textMuted}>{longDate(data?.date ?? today())}</T>
          <T variant="title">Olá, {firstName(name)}</T>
        </View>
        <Avatar name={name} uri={absoluteUrl(data?.user.photoUrl ?? user?.photoUrl)} onPress={() => router.push('/perfil')} />
      </View>

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={4} /> : null}

      {data ? (
        <>
          <LevelCard progress={data.progress} />

          <View style={styles.statsRow}>
            <StatTile
              icon="flame"
              iconColor={colors.carbs}
              value={formatNumber(data.nutrition.consumed.calories)}
              caption={data.nutrition.goal.dailyCalories ? `de ${formatNumber(data.nutrition.goal.dailyCalories)} kcal` : 'kcal hoje'}
              onPress={() => router.push('/nutricao')}
            />
            <StatTile
              icon="pulse"
              iconColor={colors.protein}
              value={String(data.activities.totalMinutes)}
              unit="min"
              caption={data.activities.count ? `${data.activities.count} atividade${data.activities.count > 1 ? 's' : ''} · ${formatNumber(data.activities.caloriesBurned)} kcal` : 'Nenhuma atividade'}
              onPress={() => router.push('/atividades')}
            />
            <StatTile
              icon="drop"
              iconColor={colors.water}
              value={formatNumber(data.water.totalMl)}
              unit="ml"
              caption={data.water.goalMl ? `de ${formatNumber(data.water.goalMl)} ml` : 'água hoje'}
              onPress={() => router.push('/nutricao')}
            />
          </View>

          <View style={styles.statsRow}>
            <Card style={styles.wide} onPress={() => router.push('/treinos')}>
              <View style={styles.rowCenter}>
                <Icon name="bolt" size={22} color={data.streak.active ? colors.carbs : colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tileValue}>
                    {data.streak.currentStreakDays}
                    <Text style={styles.unit}> dias</Text>
                  </Text>
                  <T variant="caption" style={{ fontSize: 11 }}>
                    {data.streak.active ? 'Sequência de treinos' : 'Sequência parada'}
                  </T>
                </View>
              </View>
            </Card>
            <Card style={styles.wide} onPress={() => router.push('/rank')}>
              <View style={styles.rowCenter}>
                <RankBadge rank={data.strengthRank?.rank} size={36} locked={!data.strengthRank} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tileValue} numberOfLines={1}>{rankLabel(data.strengthRank?.rank)}</Text>
                  <T variant="caption" style={{ fontSize: 11 }}>
                    {data.strengthRank ? `Nota ${data.strengthRank.score} · ${data.strengthRank.lp} LP` : 'Rank de força'}
                  </T>
                </View>
              </View>
            </Card>
          </View>

          <Section
            title="Tarefas de hoje"
            action={data.tasks.total ? `${data.tasks.completed} de ${data.tasks.total} · Ver todas` : 'Ver todas'}
            onAction={() => router.push('/tarefas')}
          >
            {data.tasks.items.length === 0 ? (
              <EmptyState
                title="Nenhuma tarefa para hoje"
                message="Crie um hábito e ganhe XP ao concluir."
                action="Criar tarefa"
                onAction={() => router.push('/tarefas/nova')}
              />
            ) : (
              <Card padded={false} style={{ overflow: 'hidden' }}>
                {data.tasks.items.map((task, i) => (
                  <TaskRow key={task.id} task={task} last={i === data.tasks.items.length - 1} onToggle={() => toggleTask(task)} />
                ))}
              </Card>
            )}
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

function patchTask(d: Dashboard, id: number, completed: boolean): Dashboard {
  const items = d.tasks.items.map((t) => (t.id === id ? { ...t, completed } : t));
  return { ...d, tasks: { ...d.tasks, items, completed: items.filter((t) => t.completed).length } };
}

function LevelCard({ progress }: { progress: Dashboard['progress'] }) {
  const inLevel = progress.levelProgressPercent;
  return (
    <Card style={styles.levelCard} onPress={() => router.push('/perfil')}>
      <Ring value={inLevel} size={92}>
        <Text style={styles.levelNumber}>{progress.level}</Text>
        <Text style={styles.levelLabel}>NÍVEL</Text>
      </Ring>
      <View style={{ flex: 1, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={styles.xp}>{formatNumber(progress.totalXp)}</Text>
          <T variant="label" color={colors.textMuted}>XP total</T>
        </View>
        <ProgressBar value={inLevel} />
        <T variant="caption">
          {100 - progress.xpToNextLevel} / 100 XP para o nível {progress.level + 1}
        </T>
        {progress.category ? <Tag tone="accent" label={`Categoria · ${progress.category}`} /> : null}
      </View>
    </Card>
  );
}

function StatTile({
  icon,
  iconColor,
  value,
  unit,
  caption,
  onPress,
}: {
  icon: IconName;
  iconColor: string;
  value: string;
  unit?: string;
  caption: string;
  onPress: () => void;
}) {
  return (
    <Card style={styles.tile} onPress={onPress} padded={false}>
      <Icon name={icon} size={20} color={iconColor} />
      <Text style={styles.tileValue}>
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.tileCaption} numberOfLines={2}>{caption}</Text>
    </Card>
  );
}

function TaskRow({ task, last, onToggle }: { task: Task; last: boolean; onToggle: () => void }) {
  const meta = [hhmm(task.time), task.recurring ? 'Hábito' : 'Única', task.recurring ? weekDaysLabel(task.weekDays) : '']
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={onToggle}
      onLongPress={() => router.push({ pathname: '/tarefas/[id]', params: { id: String(task.id) } })}
      style={[styles.taskRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
    >
      <Checkbox checked={task.completed} onPress={onToggle} label={`Concluir ${task.title}`} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={[
            styles.taskTitle,
            task.completed && { color: colors.textDone, textDecorationLine: 'line-through' },
          ]}
        >
          {task.title}
        </Text>
        {meta ? <T variant="caption" color={task.completed ? colors.textDone : colors.textMuted}>{meta}</T> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  levelCard: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18, borderRadius: 24 },
  levelNumber: { fontFamily: fonts.display, fontSize: 26, color: colors.text, lineHeight: 30 },
  levelLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  xp: { fontFamily: fonts.title, fontSize: 22, color: colors.text },
  statsRow: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, gap: 8, padding: 14 },
  wide: { flex: 1, padding: 14 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tileValue: { fontFamily: fonts.title, fontSize: 17, color: colors.text },
  unit: { fontSize: 12, color: colors.textMuted },
  tileCaption: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, lineHeight: 14 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  taskTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
});
