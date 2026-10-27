import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { exerciseApi, routineApi, workoutApi } from '@/api/endpoints';
import type { Exercise } from '@/api/types';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Chip, ChipRow, EmptyState, ErrorBanner, Header, IconButton, Screen, SearchField, SkeletonList, T, Tag } from '@/components/ui';
import { equipmentLabel, levelLabel, levelTone } from '@/components/workouts/labels';
import { ExerciseThumb } from '@/components/workouts/parts';
import { colors, fonts, radius } from '@/theme';
import { formatNumber } from '@/utils/format';
import { MUSCLE_GROUPS } from '@/utils/ranks';

type PickFor = 'workout' | 'routine' | 'swap';
const PAGE_SIZE = 20;

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function ExerciciosScreen() {
  const params = useLocalSearchParams<{ pickFor?: string; targetId?: string }>();
  const pickFor: PickFor | null =
    params.pickFor === 'workout' || params.pickFor === 'routine' || params.pickFor === 'swap' ? params.pickFor : null;
  const targetId = params.targetId ? Number(params.targetId) : null;
  const picking = !!pickFor && !!targetId;
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [rankedOnly, setRankedOnly] = useState(false);

  const [items, setItems] = useState<Exercise[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickingId, setPickingId] = useState<number | null>(null);
  const [targetName, setTargetName] = useState<string | null>(null);
  const requestId = useRef(0);
  const rankedCache = useRef<Exercise[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Nome do treino/rotina de destino para o subtítulo.
  useEffect(() => {
    if (!picking || pickFor === 'swap') return;
    const p = pickFor === 'workout' ? workoutApi.get(targetId!).then((w) => w.workoutType) : routineApi.get(targetId!).then((r) => r.name);
    p.then(setTargetName).catch(() => undefined);
  }, [picking, pickFor, targetId]);

  const load = useCallback(
    async (nextPage: number) => {
      const id = ++requestId.current;
      if (nextPage === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        if (rankedOnly) {
          if (!rankedCache.current) rankedCache.current = await exerciseApi.ranked();
          const q = normalize(debounced);
          const list = rankedCache.current.filter(
            (e) => (!q || normalize(e.name).includes(q)) && (!muscle || (e.muscleGroup ?? '').toLowerCase() === muscle.toLowerCase()),
          );
          if (id !== requestId.current) return;
          setItems(list);
          setTotal(list.length);
          setLast(true);
          setPage(0);
        } else {
          const res = await exerciseApi.search({ name: debounced || undefined, muscleGroup: muscle ?? undefined, page: nextPage, size: PAGE_SIZE });
          if (id !== requestId.current) return;
          setItems((prev) => (nextPage === 0 ? res.content : [...prev, ...res.content.filter((e) => !prev.some((p) => p.id === e.id))]));
          setTotal(res.totalElements);
          setLast(res.last);
          setPage(res.page);
        }
      } catch (e) {
        if (id !== requestId.current) return;
        setError(e instanceof Error ? e.message : 'Não foi possível carregar os exercícios.');
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debounced, muscle, rankedOnly],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  function loadMore() {
    if (loading || loadingMore || last || error) return;
    void load(page + 1);
  }

  async function pick(ex: Exercise) {
    if (!pickFor || !targetId || pickingId) return;
    setPickingId(ex.id);
    try {
      if (pickFor === 'workout') await workoutApi.addExercise(targetId, ex.id);
      else if (pickFor === 'routine') await routineApi.addExercise(targetId, { exerciseId: ex.id, targetSets: 3, targetReps: '8-12', restSeconds: 90 });
      else await workoutApi.swapExercise(targetId, ex.id);
      toast.success(pickFor === 'swap' ? `Trocado por ${ex.name}` : `${ex.name} adicionado`);
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível adicionar o exercício.');
      setPickingId(null);
    }
  }

  function openDetail(ex: Exercise) {
    router.push({
      pathname: '/exercicios/[id]',
      params: picking ? { id: String(ex.id), pickFor: pickFor!, targetId: String(targetId) } : { id: String(ex.id) },
    });
  }

  const subtitle = !picking ? undefined : pickFor === 'swap' ? 'Trocar exercício do treino' : `Adicionar ${pickFor === 'workout' ? 'ao treino' : 'à rotina'}${targetName ? ` ${targetName}` : ''}`;

  const header = (
    <View style={{ gap: 16, paddingBottom: 6 }}>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar exercício"
        right={
          query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => setQuery('')} hitSlop={10}>
              <Icon name="close" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null
        }
      />
      <ChipRow>
        <Chip label="Com rank" tone="accent" active={rankedOnly} onPress={() => setRankedOnly((v) => !v)} />
        <Chip label="Todos" active={!muscle} onPress={() => setMuscle(null)} />
        {MUSCLE_GROUPS.map((m) => (
          <Chip key={m} label={m} active={muscle === m} onPress={() => setMuscle((cur) => (cur === m ? null : m))} />
        ))}
      </ChipRow>
      {error ? <ErrorBanner message={error} onRetry={() => load(items.length && !rankedOnly ? page + 1 : 0)} /> : null}
      {!loading && total !== null && !error ? (
        <Text style={styles.count}>
          {formatNumber(total)} {total === 1 ? 'RESULTADO' : 'RESULTADOS'}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false}>
      <Header
        title="Exercícios"
        subtitle={subtitle}
        right={<IconButton icon="plus" label="Novo exercício" onPress={() => router.push('/exercicios/novo')} />}
      />
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(e) => String(e.id)}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? (
            <SkeletonList rows={5} />
          ) : error ? undefined : (
            <EmptyState
              icon="search"
              title="Nenhum exercício encontrado"
              message={rankedOnly ? 'Nenhum exercício com rank neste filtro.' : 'Tente outro nome ou grupo muscular, ou cadastre o seu.'}
              action="Novo exercício"
              onAction={() => router.push('/exercicios/novo')}
            />
          )
        }
        renderItem={({ item }) => (
          <ExerciseRow ex={item} picking={picking} busy={pickingId === item.id} disabled={pickingId !== null} onPress={() => openDetail(item)} onPick={() => pick(item)} swap={pickFor === 'swap'} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} /> : undefined}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 32 }}
        style={{ marginHorizontal: -20, paddingHorizontal: 20 }}
      />
    </Screen>
  );
}

function ExerciseRow({
  ex,
  picking,
  busy,
  disabled,
  swap,
  onPress,
  onPick,
}: {
  ex: Exercise;
  picking: boolean;
  busy: boolean;
  disabled: boolean;
  swap: boolean;
  onPress: () => void;
  onPick: () => void;
}) {
  const equipment = equipmentLabel(ex.equipment);
  const level = levelLabel(ex.level);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <ExerciseThumb uri={ex.imageUrl} size={64} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.name} numberOfLines={2}>{ex.name}</Text>
        {ex.muscleGroup ? <T variant="caption" numberOfLines={1}>{ex.muscleGroup}</T> : null}
        <View style={styles.tags}>
          {equipment ? <Tag label={equipment} /> : null}
          {level ? <Tag label={level} tone={levelTone(ex.level)} /> : null}
          {ex.source === 'CUSTOM' ? <Tag label="Personalizado" tone="info" /> : null}
        </View>
      </View>
      {picking ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={swap ? `Trocar por ${ex.name}` : `Adicionar ${ex.name}`}
          onPress={onPick}
          disabled={disabled}
          hitSlop={6}
          style={({ pressed }) => [styles.add, disabled && !busy && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
        >
          {busy ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Icon name={swap ? 'check' : 'plus'} size={20} color={colors.onAccent} strokeWidth={2.4} />}
        </Pressable>
      ) : (
        <Icon name="chevronRight" size={18} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  count: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.7, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  add: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
