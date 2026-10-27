import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { goalApi, mealApi, trackingApi } from '@/api/endpoints';
import type { DailyNutrition, Meal, MealItem, WaterDay } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { MacroInline, sumItems } from '@/components/nutrition/shared';
import { useToast } from '@/components/Toast';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  IconButton,
  PageTitle,
  ProgressBar,
  Ring,
  Screen,
  SkeletonList,
  T,
} from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { addDays, formatNumber, percent, shortDate, today, weekdayShort } from '@/utils/format';

interface MealWithItems {
  meal: Meal;
  items: MealItem[];
}

interface NutritionDay {
  date: string;
  daily: DailyNutrition;
  water: WaterDay;
  meals: MealWithItems[];
}

function dayLabel(date: string) {
  const t = today();
  const prefix = date === t ? 'Hoje' : date === addDays(t, -1) ? 'Ontem' : date === addDays(t, 1) ? 'Amanhã' : weekdayShort(date).charAt(0) + weekdayShort(date).slice(1).toLowerCase();
  return `${prefix} · ${shortDate(date)}`;
}

function mealTime(meal: Meal) {
  const m = /T(\d{2}:\d{2})/.exec(meal.createdAt ?? '');
  return m ? m[1] : '';
}

export default function NutricaoScreen() {
  const userId = useUserId();
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [creating, setCreating] = useState(false);
  const [addingWater, setAddingWater] = useState<number | null>(null);

  const { data, error, loading, refreshing, refresh, reload, setData } = useApi<NutritionDay>(async () => {
    const [daily, water, meals] = await Promise.all([
      goalApi.daily(userId, date),
      trackingApi.water(userId, date),
      mealApi.list(userId, date),
    ]);
    const withItems = await Promise.all(
      meals.map(async (meal) => ({ meal, items: await mealApi.items(meal.id) })),
    );
    return { date, daily, water, meals: withItems };
  }, [userId, date]);

  const isToday = date === today();
  const dataForDate = data && data.date === date ? data : undefined;

  async function addWater(ml: number) {
    setAddingWater(ml);
    try {
      const water = await trackingApi.addWater(userId, ml, date);
      setData((d) => ({ ...d!, water }));
      toast.success(`+${ml} ml de água`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível registrar a água.');
    } finally {
      setAddingWater(null);
    }
  }

  async function undoWater() {
    const last = data?.water.entries[data.water.entries.length - 1];
    if (!last) return;
    try {
      await trackingApi.removeWater(last.id);
      const water = await trackingApi.water(userId, date);
      setData((d) => ({ ...d!, water }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível desfazer.');
    }
  }

  async function createMeal() {
    setCreating(true);
    try {
      const meal = await mealApi.create(userId, { date });
      router.push({ pathname: '/refeicoes/[id]', params: { id: String(meal.id) } });
      void reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível criar a refeição.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Screen withTabBar refreshing={refreshing} onRefresh={refresh}>
      <PageTitle
        overline={dayLabel(date)}
        title="Nutrição"
        right={
          <View style={styles.dayNav}>
            <IconButton icon="back" label="Dia anterior" onPress={() => setDate((d) => addDays(d, -1))} />
            {!isToday ? (
              <Pressable accessibilityRole="button" onPress={() => setDate(today())} style={styles.todayBtn} hitSlop={6}>
                <Text style={styles.todayText}>Hoje</Text>
              </Pressable>
            ) : null}
            <IconButton icon="chevronRight" label="Próximo dia" onPress={() => setDate((d) => addDays(d, 1))} />
          </View>
        }
      />

      {error && !dataForDate ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !dataForDate ? <SkeletonList rows={4} /> : null}

      {dataForDate ? (
        <>
          <SummaryCard daily={dataForDate.daily} />

          {!dataForDate.daily.goal.dailyCalories ? (
            <Card style={styles.goalCta} onPress={() => router.push('/perfil/editar')}>
              <Icon name="target" size={22} color={colors.accent} />
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>Defina suas metas</T>
                <T variant="caption">Calorias, macros e água por dia para acompanhar o progresso.</T>
              </View>
              <Icon name="chevronRight" size={18} color={colors.textMuted} />
            </Card>
          ) : null}

          <View style={{ gap: 6 }}>
            <Pressable
              accessibilityRole="search"
              accessibilityLabel="Buscar alimento"
              onPress={() => router.push('/alimentos/buscar')}
              style={styles.search}
            >
              <Icon name="search" size={18} color={colors.textMuted} />
              <Text style={styles.searchText} numberOfLines={1}>Buscar alimento ou código de barras</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ler código de barras"
                onPress={() => router.push('/alimentos/scanner')}
                hitSlop={6}
                style={styles.scanBtn}
              >
                <Icon name="barcode" size={18} color={colors.text} />
              </Pressable>
            </Pressable>
            <T variant="caption" style={{ fontSize: 11, paddingLeft: 4 }}>Catálogo TACO + Open Food Facts</T>
          </View>

          <WaterCard water={dataForDate.water} adding={addingWater} onAdd={addWater} onUndo={undoWater} />

          <View style={{ gap: 10 }}>
            {dataForDate.meals.length === 0 ? (
              <EmptyState
                icon="apple"
                title={isToday ? 'Nenhuma refeição hoje' : 'Nenhuma refeição neste dia'}
                message="Registre o que você comeu para acompanhar calorias e macros."
              />
            ) : (
              dataForDate.meals.map(({ meal, items }) => <MealCard key={meal.id} meal={meal} items={items} />)
            )}
            <Pressable
              accessibilityRole="button"
              onPress={createMeal}
              disabled={creating}
              style={({ pressed }) => [styles.newMeal, (pressed || creating) && { opacity: 0.7 }]}
            >
              <Icon name="plus" size={18} color={colors.accent} strokeWidth={2.2} />
              <Text style={styles.newMealText}>{creating ? 'Criando…' : 'Nova refeição'}</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function SummaryCard({ daily }: { daily: DailyNutrition }) {
  const { consumed, goal } = daily;
  return (
    <Card style={styles.summary}>
      <Ring value={percent(consumed.calories, goal.dailyCalories)} size={120} stroke={10}>
        <Text style={styles.kcal}>{formatNumber(consumed.calories)}</Text>
        <Text style={styles.kcalGoal}>{goal.dailyCalories ? `de ${formatNumber(goal.dailyCalories)} kcal` : 'kcal'}</Text>
      </Ring>
      <View style={{ flex: 1, gap: 12 }}>
        <MacroGoal label="Proteína" value={consumed.protein} goal={goal.proteinG} color={colors.protein} />
        <MacroGoal label="Carboidratos" value={consumed.carbs} goal={goal.carbsG} color={colors.carbs} />
        <MacroGoal label="Gordura" value={consumed.fat} goal={goal.fatG} color={colors.fat} />
      </View>
    </Card>
  );
}

function MacroGoal({ label, value, goal, color }: { label: string; value: number; goal: number | null; color: string }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.macroHead}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {formatNumber(value)}
          {goal ? ` / ${formatNumber(goal)}` : ''} g
        </Text>
      </View>
      <ProgressBar value={goal ? percent(value, goal) : 0} color={color} height={6} />
    </View>
  );
}

function WaterCard({
  water,
  adding,
  onAdd,
  onUndo,
}: {
  water: WaterDay;
  adding: number | null;
  onAdd: (ml: number) => void;
  onUndo: () => void;
}) {
  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.waterHead}>
        <Icon name="drop" size={22} color={colors.water} />
        <View style={{ flex: 1 }}>
          <Text style={styles.waterValue}>
            {formatNumber(water.totalMl)}
            <Text style={styles.waterUnit}>{water.goalMl ? ` / ${formatNumber(water.goalMl)} ml` : ' ml'}</Text>
          </Text>
          <T variant="caption" style={{ fontSize: 11 }}>Água</T>
        </View>
        {water.entries.length ? (
          <Pressable accessibilityRole="button" onPress={onUndo} hitSlop={8} style={{ paddingVertical: 10 }}>
            <T variant="label" color={colors.textMuted} style={{ fontFamily: fonts.bold }}>Desfazer</T>
          </Pressable>
        ) : null}
      </View>
      <ProgressBar value={percent(water.totalMl, water.goalMl)} color={colors.water} height={6} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="+250 ml" variant="secondary" small style={{ flex: 1 }} loading={adding === 250} disabled={adding !== null} onPress={() => onAdd(250)} />
        <Button title="+500 ml" variant="secondary" small style={{ flex: 1 }} loading={adding === 500} disabled={adding !== null} onPress={() => onAdd(500)} />
      </View>
    </Card>
  );
}

function MealCard({ meal, items }: MealWithItems) {
  const total = sumItems(items);
  const time = mealTime(meal);
  return (
    <Card style={styles.meal} onPress={() => router.push({ pathname: '/refeicoes/[id]', params: { id: String(meal.id) } })}>
      <View style={styles.mealHead}>
        <Text style={styles.mealName} numberOfLines={1}>
          {meal.name}
          {time ? <Text style={styles.mealTime}> · {time}</Text> : null}
        </Text>
        <Text style={styles.mealKcal}>{formatNumber(total.calories)} kcal</Text>
      </View>
      {items.length === 0 ? (
        <T variant="caption">Nenhum item ainda · toque para adicionar</T>
      ) : (
        <View style={{ gap: 6 }}>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>{item.foodName}</Text>
              <Text style={styles.itemQty}>{formatNumber(item.quantity)} {item.unit ?? 'g'}</Text>
            </View>
          ))}
        </View>
      )}
      {items.length ? <MacroInline protein={total.protein} carbs={total.carbs} fat={total.fat} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  dayNav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  todayBtn: { height: 44, paddingHorizontal: 10, justifyContent: 'center' },
  todayText: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18, borderRadius: 24 },
  kcal: { fontFamily: fonts.display, fontSize: 24, color: colors.text, lineHeight: 28 },
  kcalGoal: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted, marginTop: 4 },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.text },
  macroValue: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  goalCta: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.accentSoftBorder, backgroundColor: colors.accentSoft },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingLeft: 16,
    paddingRight: 7,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderInput,
  },
  searchText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  scanBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  waterHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waterValue: { fontFamily: fonts.title, fontSize: 17, color: colors.text },
  waterUnit: { fontSize: 12, color: colors.textMuted },
  meal: { paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  mealHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  mealName: { flex: 1, fontFamily: fonts.title, fontSize: 14, color: colors.text },
  mealTime: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  mealKcal: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  itemName: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textSoft },
  itemQty: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  newMeal: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  newMealText: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
});
