import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { taskApi, userApi } from '@/api/endpoints';
import type { Task } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { daysTag, timeOfDateTime } from '@/components/rotina/dates';
import { useToast } from '@/components/Toast';
import {
  Checkbox,
  Chip,
  EmptyState,
  ErrorBanner,
  Fab,
  IconButton,
  PageTitle,
  Screen,
  SearchField,
  SkeletonList,
  T,
} from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';
import { addDays, hhmm, parseIsoDate, today } from '@/utils/format';

type Filter = 'all' | 'habits' | 'once';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

// Semana atual, de domingo a sábado.
function currentWeek(todayIso: string) {
  const start = addDays(todayIso, -parseIsoDate(todayIso).getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export default function TarefasScreen() {
  const userId = useUserId();
  const toast = useToast();
  const todayIso = today();
  const week = useMemo(() => currentWeek(todayIso), [todayIso]);
  const [date, setDate] = useState(todayIso);
  const [filter, setFilter] = useState<Filter>('all');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const levelRef = useRef<number | null>(null);

  const { data, error, loading, refreshing, refresh, reload, setData } = useApi(
    () => taskApi.forDate(userId, date),
    [userId, date],
  );

  useEffect(() => {
    userApi
      .progress(userId)
      .then((p) => {
        levelRef.current = p.level;
      })
      .catch(() => {});
  }, [userId]);

  const isFuture = date > todayIso;
  const tasks = data ?? [];
  const habits = tasks.filter((t) => t.recurring);
  const once = tasks.filter((t) => !t.recurring);
  const q = query.trim().toLowerCase();
  const visible = (filter === 'habits' ? habits : filter === 'once' ? once : tasks).filter(
    (t) => !q || t.title.toLowerCase().includes(q),
  );
  const done = tasks.filter((t) => t.completed).length;

  async function toggle(task: Task) {
    if (isFuture || busyId) return;
    const completing = !task.completed;
    setBusyId(task.id);
    setData((list) => (list ?? []).map((t) => (t.id === task.id ? { ...t, completed: completing } : t)));
    try {
      const updated = completing ? await taskApi.complete(task.id, date) : await taskApi.uncomplete(task.id, date);
      setData((list) => (list ?? []).map((t) => (t.id === task.id ? updated : t)));
      if (completing) {
        toast.success(`${task.title} · +10 XP`);
        const progress = await userApi.progress(userId).catch(() => null);
        if (progress) {
          const before = levelRef.current;
          levelRef.current = progress.level;
          if (before !== null && progress.level > before) {
            router.push({
              pathname: '/celebracao/nivel',
              params: { level: String(progress.level), xp: String(progress.totalXp) },
            });
          }
        }
      } else {
        levelRef.current = null;
        void userApi.progress(userId).then((p) => (levelRef.current = p.level)).catch(() => {});
      }
    } catch (e) {
      setData((list) => (list ?? []).map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t)));
      toast.error(e instanceof Error ? e.message : 'Não foi possível atualizar a tarefa.');
    } finally {
      setBusyId(null);
    }
  }

  const selected = parseIsoDate(date);

  return (
    <Screen
      withTabBar
      refreshing={refreshing}
      onRefresh={refresh}
      overlay={<Fab title="Nova tarefa" onPress={() => router.push('/tarefas/nova')} />}
    >
      <PageTitle
        overline={`${MONTHS[selected.getMonth()]} ${selected.getFullYear()}`}
        title="Tarefas"
        right={
          <IconButton
            icon={searching ? 'close' : 'search'}
            label={searching ? 'Fechar busca' : 'Buscar tarefas'}
            size={48}
            onPress={() => {
              setSearching((s) => !s);
              setQuery('');
            }}
          />
        }
      />

      {searching ? <SearchField value={query} onChangeText={setQuery} placeholder="Buscar tarefa" /> : null}

      <View style={styles.week} accessibilityRole="tablist" accessibilityLabel="Semana">
        {week.map((d) => {
          const active = d === date;
          const isToday = d === todayIso;
          const day = parseIsoDate(d);
          return (
            <Pressable
              key={d}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${DAY_SHORT[day.getDay()]} ${day.getDate()}${isToday ? ', hoje' : ''}`}
              onPress={() => setDate(d)}
              style={[styles.day, active && styles.dayActive]}
            >
              <Text style={[styles.dayName, active && { color: colors.onAccent, fontFamily: fonts.extrabold }]}>
                {DAY_SHORT[day.getDay()]}
              </Text>
              <Text style={[styles.dayNumber, active && { color: colors.onAccent, fontFamily: fonts.extrabold }]}>
                {day.getDate()}
              </Text>
              {isToday && !active ? <View style={styles.todayDot} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.filters}>
        <Chip label={`Todas · ${tasks.length}`} active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={`Hábitos · ${habits.length}`} active={filter === 'habits'} onPress={() => setFilter('habits')} />
        <Chip label={`Únicas · ${once.length}`} active={filter === 'once'} onPress={() => setFilter('once')} />
      </View>

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={4} /> : null}

      {data ? (
        <>
          {tasks.length > 0 ? (
            <T variant="caption">
              {isFuture
                ? 'Dia futuro: dá para ver e editar, mas só concluir quando chegar.'
                : `${done} de ${tasks.length} concluída${tasks.length > 1 ? 's' : ''}${date === todayIso ? ' hoje' : ''}`}
            </T>
          ) : null}

          {visible.length === 0 ? (
            tasks.length === 0 ? (
              <EmptyState
                title={date === todayIso ? 'Nenhuma tarefa para hoje' : 'Nenhuma tarefa neste dia'}
                message="Crie um hábito e ganhe XP ao concluir."
                action="Criar tarefa"
                onAction={() => router.push('/tarefas/nova')}
              />
            ) : (
              <EmptyState
                icon="search"
                title="Nada por aqui"
                message={q ? 'Nenhuma tarefa com esse nome.' : 'Nenhuma tarefa deste tipo neste dia.'}
              />
            )
          ) : (
            <View style={{ gap: 10 }}>
              {visible.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  date={date}
                  todayIso={todayIso}
                  disabled={isFuture}
                  busy={busyId === task.id}
                  onToggle={() => toggle(task)}
                />
              ))}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function TaskCard({
  task,
  date,
  todayIso,
  disabled,
  busy,
  onToggle,
}: {
  task: Task;
  date: string;
  todayIso: string;
  disabled: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  const doneColor = task.completed ? colors.textDone : undefined;
  let tag: string;
  let tagBg: string;
  let tagFg: string;
  if (task.recurring) {
    tag = daysTag(task.weekDays) || 'Hábito';
    tagBg = colors.accentSoft;
    tagFg = colors.accent;
  } else {
    tag = !task.date ? 'Sem data' : date === todayIso ? 'Só hoje' : 'Só neste dia';
    tagBg = colors.proteinSoft;
    tagFg = colors.protein;
  }
  if (task.completed) {
    tagBg = colors.surface2;
    tagFg = colors.textDone;
  }
  const completedTime = timeOfDateTime(task.completedAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Editar ${task.title}`}
      onPress={() => router.push({ pathname: '/tarefas/[id]', params: { id: String(task.id) } })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={{ opacity: disabled ? 0.35 : busy ? 0.6 : 1 }}>
        <Checkbox
          checked={task.completed}
          onPress={disabled ? undefined : onToggle}
          label={`${task.completed ? 'Desmarcar' : 'Concluir'} ${task.title}`}
          size={24}
        />
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        <Text
          style={[styles.title, task.completed && { color: colors.textDone, textDecorationLine: 'line-through' }]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={styles.meta}>
          {task.time ? <T variant="caption" color={doneColor}>{hhmm(task.time)}</T> : null}
          <View style={[styles.tag, { backgroundColor: tagBg }]}>
            <Text style={[styles.tagText, { color: tagFg }]}>{tag}</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.side, task.completed && { color: colors.textDone }]}>
        {task.completed ? (completedTime ? `Concluída ${completedTime}` : 'Concluída') : task.recurring ? 'Hábito' : 'Única'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    height: 64,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayName: { fontFamily: fonts.bold, fontSize: 10, color: colors.textMuted },
  dayNumber: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  todayDot: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.chip },
  tagText: { fontFamily: fonts.bold, fontSize: 11 },
  side: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted },
});
