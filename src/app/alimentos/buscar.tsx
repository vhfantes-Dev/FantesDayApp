import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { foodApi } from '@/api/endpoints';
import type { ExternalFood, Food } from '@/api/types';
import { Icon } from '@/components/Icon';
import { MacroInline, Segmented, SourceTag, useDebouncedEffect } from '@/components/nutrition/shared';
import { useToast } from '@/components/Toast';
import { EmptyState, ErrorBanner, IconButton, Screen, SearchField, SkeletonList, Tag } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { formatNumber } from '@/utils/format';

type SourceTab = 'catalog' | 'off';
const PAGE_SIZE = 20;

export default function BuscarAlimentosScreen() {
  const { mealId, q } = useLocalSearchParams<{ mealId?: string; q?: string }>();
  const mealParams = mealId ? { mealId } : {};
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState(typeof q === 'string' ? q : '');
  const [tab, setTab] = useState<SourceTab>('catalog');

  // Catálogo (paginado)
  const [foods, setFoods] = useState<Food[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  // Open Food Facts
  const [external, setExternal] = useState<ExternalFood[]>([]);
  const [extLoading, setExtLoading] = useState(false);
  const [extError, setExtError] = useState<string | null>(null);
  const [extSearched, setExtSearched] = useState('');
  const [importing, setImporting] = useState<string | null>(null);

  const term = query.trim();

  const loadCatalog = useCallback(async (name: string, pageNumber: number) => {
    const id = ++reqId.current;
    if (pageNumber === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await foodApi.search(name || undefined, pageNumber, PAGE_SIZE);
      if (id !== reqId.current) return;
      setFoods((prev) => (pageNumber === 0 ? res.content : [...prev, ...res.content.filter((f) => !prev.some((p) => p.id === f.id))]));
      setTotal(res.totalElements);
      setPage(res.page);
      setLast(res.last);
      setError(null);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e instanceof Error ? e.message : 'Não foi possível buscar.');
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  const loadExternal = useCallback(async (q: string) => {
    if (q.length < 2) {
      setExternal([]);
      setExtSearched('');
      return;
    }
    setExtLoading(true);
    try {
      const res = await foodApi.external(q);
      setExternal(res);
      setExtSearched(q);
      setExtError(null);
    } catch (e) {
      setExtError(e instanceof Error ? e.message : 'Não foi possível buscar no Open Food Facts.');
    } finally {
      setExtLoading(false);
    }
  }, []);

  useDebouncedEffect(() => void loadCatalog(term, 0), [term], 350);
  useDebouncedEffect(
    () => {
      if (tab === 'off' && term !== extSearched) void loadExternal(term);
    },
    [term, tab],
    500,
  );

  function loadMore() {
    if (tab !== 'catalog' || loading || loadingMore || last || error) return;
    void loadCatalog(term, page + 1);
  }

  function openFood(id: number) {
    router.push({ pathname: '/alimentos/[id]', params: { id: String(id), ...mealParams } });
  }

  async function importExternal(item: ExternalFood) {
    if (importing) return;
    setImporting(item.barcode);
    try {
      const food = await foodApi.barcode(item.barcode);
      openFood(food.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível importar o produto.');
    } finally {
      setImporting(null);
    }
  }

  const header = (
    <View style={{ gap: 16, paddingBottom: 12 }}>
      <View style={styles.topRow}>
        <IconButton icon="back" label="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/nutricao'))} />
        <View style={{ flex: 1 }}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar alimento" />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ler código de barras"
          onPress={() => router.push({ pathname: '/alimentos/scanner', params: mealParams })}
          style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.85 }]}
        >
          <Icon name="barcode" size={20} color={colors.onAccent} strokeWidth={2} />
        </Pressable>
      </View>
      <Segmented
        label="Fonte"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'catalog', label: total !== null && tab === 'catalog' ? `Catálogo · ${formatNumber(total)}` : 'Catálogo' },
          { value: 'off', label: 'Open Food Facts' },
        ]}
      />
      <Text style={styles.overline}>
        {tab === 'catalog' ? (term ? 'RESULTADOS NO CATÁLOGO' : 'CATÁLOGO') : 'OPEN FOOD FACTS · NÃO SALVOS ATÉ VOCÊ USAR'}
      </Text>
    </View>
  );

  const footer = (
    <View style={{ gap: 16, paddingTop: 6 }}>
      {loadingMore ? <ActivityIndicator color={colors.accent} /> : null}
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Não encontrou o alimento?</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/alimentos/novo', params: mealParams })}
          style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.85 }]}
        >
          <Icon name="plus" size={16} color={colors.accent} strokeWidth={2.4} />
          <Text style={styles.createText}>Cadastrar alimento</Text>
        </Pressable>
      </View>
    </View>
  );

  const listStyle = { paddingHorizontal: 20, paddingBottom: insets.bottom + 28 };

  return (
    <Screen scroll={false} contentStyle={{ paddingHorizontal: 0 }}>
      {tab === 'catalog' ? (
        <FlatList
          data={loading && foods.length === 0 ? [] : foods}
          keyExtractor={(f) => String(f.id)}
          contentContainerStyle={listStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            error ? (
              <ErrorBanner message={error} onRetry={() => void loadCatalog(term, 0)} />
            ) : loading ? (
              <SkeletonList rows={5} />
            ) : (
              <EmptyState
                icon="search"
                title="Nada encontrado"
                message={term ? `Nenhum alimento para "${term}" no catálogo. Tente o Open Food Facts.` : 'O catálogo está vazio.'}
                action={term ? 'Buscar no Open Food Facts' : undefined}
                onAction={() => setTab('off')}
              />
            )
          }
          renderItem={({ item }) => (
            <FoodRow
              name={item.name}
              tag={<SourceTag source={item.source} />}
              kcal={item.caloriesPer100g}
              protein={item.proteinPer100g}
              carbs={item.carbsPer100g}
              fat={item.fatPer100g}
              onPress={() => openFood(item.id)}
            />
          )}
        />
      ) : (
        <FlatList
          data={extLoading ? [] : external}
          keyExtractor={(f) => f.barcode}
          contentContainerStyle={listStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ListEmptyComponent={
            extError ? (
              <ErrorBanner message={extError} onRetry={() => void loadExternal(term)} />
            ) : extLoading ? (
              <SkeletonList rows={4} />
            ) : term.length < 2 ? (
              <EmptyState icon="search" title="Busque um produto" message="Digite ao menos 2 letras para pesquisar no Open Food Facts." />
            ) : (
              <EmptyState
                icon="search"
                title="Nada encontrado"
                message="O Open Food Facts não respondeu ou não tem esse produto. Tente o código de barras ou cadastre o alimento."
              />
            )
          }
          renderItem={({ item }) => (
            <FoodRow
              name={item.brand ? `${item.name} · ${item.brand}` : item.name}
              tag={<Tag label="OPEN FOOD FACTS" tone="warn" />}
              kcal={item.caloriesPer100g}
              protein={item.proteinPer100g}
              carbs={item.carbsPer100g}
              fat={item.fatPer100g}
              loading={importing === item.barcode}
              onPress={() => void importExternal(item)}
            />
          )}
        />
      )}
    </Screen>
  );
}

function FoodRow({
  name,
  tag,
  kcal,
  protein,
  carbs,
  fat,
  loading,
  onPress,
}: {
  name: string;
  tag: ReactNode;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.rowName} numberOfLines={2}>{name}</Text>
        <View style={styles.rowMeta}>
          {tag}
          <Text style={styles.rowKcal}>{kcal !== null ? `${formatNumber(kcal)} kcal` : '– kcal'} · 100 g</Text>
        </View>
        <MacroInline protein={protein} carbs={carbs} fat={fat} gap={10} />
      </View>
      <View style={styles.rowAdd}>
        {loading ? <ActivityIndicator color={colors.accent} size="small" /> : <Icon name="plus" size={18} color={colors.text} strokeWidth={2.4} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scanBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  overline: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted, letterSpacing: 0.7 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowName: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowKcal: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  rowAdd: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, alignItems: 'center', justifyContent: 'center' },
  notFound: {
    alignItems: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
  },
  notFoundText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSoft },
  createBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createText: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
});
