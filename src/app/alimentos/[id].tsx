import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { foodApi, mealApi } from '@/api/endpoints';
import type { Food, FoodUnit } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { MacroInline, QuantityStepper, Segmented, SourceTag, toGrams } from '@/components/nutrition/shared';
import { useToast } from '@/components/Toast';
import { Button, Card, ErrorBanner, IconButton, LoadingView, MacroBar, Screen, T } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { formatDecimal, formatNumber, today } from '@/utils/format';

const NEW_MEAL = 'new';

// Valor na porção a partir do valor por 100 g (grams já convertidos de ml quando preciso).
function per(value: number | null, grams: number) {
  return ((value ?? 0) * grams) / 100;
}

function initialUnit(food: Food): FoodUnit {
  return food.defaultUnit === 'ml' || food.liquid ? 'ml' : 'g';
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/nutricao');
}

export default function AlimentoScreen() {
  const { id, mealId } = useLocalSearchParams<{ id: string; mealId?: string }>();
  const foodId = Number(id);
  const { user } = useAuth();
  const toast = useToast();
  const { data: food, error, loading, reload } = useApi(() => foodApi.get(foodId), [foodId]);

  // Sem mealId, o usuário escolhe uma refeição de hoje (ou cria uma nova).
  const meals = useApi(() => mealApi.list(user!.id, today()), [user?.id], { enabled: !mealId && !!user });
  const [target, setTarget] = useState<string | null>(null);
  const selected = mealId ?? target ?? (meals.data?.length ? String(meals.data[meals.data.length - 1].id) : NEW_MEAL);

  const [qty, setQty] = useState(100);
  const [unit, setUnit] = useState<FoodUnit>('g');
  const [unitFor, setUnitFor] = useState<number | null>(null);

  // Unidade inicial = unidade padrão do alimento (ml para líquidos).
  if (food && unitFor !== food.id) {
    setUnitFor(food.id);
    const u = initialUnit(food);
    setUnit(u);
    setQty(u === 'ml' ? 200 : 100);
  }

  const grams = food ? toGrams(qty, unit, food.densityGPerMl) : 0;

  function changeUnit(u: FoodUnit) {
    if (u === unit) return;
    setUnit(u);
    setQty(u === 'ml' ? 200 : 100);
  }
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = !!food && food.source === 'CUSTOM' && food.createdById === user?.id;

  async function add() {
    if (!food || !user) return;
    if (!qty || qty <= 0) {
      toast.error('Informe uma quantidade maior que zero.');
      return;
    }
    setAdding(true);
    try {
      let targetId = selected;
      if (targetId === NEW_MEAL) {
        const meal = await mealApi.create(user.id, { date: today() });
        targetId = String(meal.id);
      }
      await mealApi.addItem(Number(targetId), { foodId: food.id, quantity: qty, unit });
      toast.success(`${food.name} adicionado · ${formatNumber(per(food.caloriesPer100g, grams))} kcal`);
      if (mealId) router.dismissTo({ pathname: '/refeicoes/[id]', params: { id: mealId } });
      else router.dismissTo('/nutricao');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível adicionar.');
      setAdding(false);
    }
  }

  function confirmDelete() {
    if (!food) return;
    Alert.alert('Excluir alimento', `Excluir "${food.name}" do catálogo? Essa ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await foodApi.remove(food.id);
            toast.success('Alimento excluído');
            goBack();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Não foi possível excluir o alimento.');
            setDeleting(false);
          }
        },
      },
    ]);
  }

  const kcal = food ? per(food.caloriesPer100g, grams) : 0;

  return (
    <Screen
      footer={
        food ? (
          <Button title={`Adicionar · ${formatNumber(kcal)} kcal`} onPress={add} loading={adding} disabled={!qty || deleting} />
        ) : undefined
      }
    >
      <View style={styles.header}>
        <IconButton icon="back" label="Voltar" onPress={goBack} />
        {food ? <SourceTag source={food.source} /> : null}
        <View style={{ flexDirection: 'row', gap: 8, minWidth: 44, justifyContent: 'flex-end' }}>
          {isOwner ? (
            <>
              <IconButton
                icon="edit"
                label="Editar alimento"
                onPress={() => router.push({ pathname: '/alimentos/novo', params: { id: String(food.id), ...(mealId ? { mealId } : {}) } })}
              />
              <IconButton icon="trash" label="Excluir alimento" color={colors.danger} onPress={confirmDelete} />
            </>
          ) : null}
        </View>
      </View>

      {error && !food ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !food ? <LoadingView /> : null}

      {food ? (
        <>
          <View style={{ gap: 6 }}>
            <Text style={styles.name}>{food.name}</Text>
            <T variant="caption" style={{ fontSize: 13 }}>
              Valores por 100 g · {formatNumber(food.caloriesPer100g)} kcal
              {food.liquid ? ` · ${formatDecimal(food.densityGPerMl ?? 1, 2)} g/ml` : ''}
            </T>
          </View>

          <View style={styles.tiles}>
            <Tile value={food.proteinPer100g} label="Proteína" color={colors.protein} />
            <Tile value={food.carbsPer100g} label="Carbos" color={colors.carbs} />
            <Tile value={food.fatPer100g} label="Gordura" color={colors.fat} />
            <Tile value={food.fiberPer100g} label="Fibra" color={colors.text} />
          </View>

          <Card style={styles.section}>
            <View style={styles.qtyHead}>
              <T variant="label">Quantidade</T>
              {food.liquid ? (
                <View style={{ width: 120 }}>
                  <Segmented
                    label="Unidade"
                    tone="accent"
                    value={unit}
                    onChange={changeUnit}
                    options={[
                      { value: 'g', label: 'g' },
                      { value: 'ml', label: 'ml' },
                    ]}
                  />
                </View>
              ) : null}
            </View>
            <QuantityStepper value={qty} onChange={setQty} unit={unit} />
            {unit === 'ml' ? (
              <T variant="caption">
                {formatNumber(qty)} ml ≈ {formatDecimal(grams, 1)} g
              </T>
            ) : null}
          </Card>

          <PortionCard food={food} grams={grams} />

          {!mealId ? (
            <View style={{ gap: 8 }}>
              <T variant="label">Adicionar em</T>
              {meals.loading && !meals.data ? (
                <LoadingView />
              ) : (
                <View style={styles.mealChips}>
                  {(meals.data ?? []).map((m) => (
                    <MealOption key={m.id} label={m.name} active={selected === String(m.id)} onPress={() => setTarget(String(m.id))} />
                  ))}
                  <MealOption label="+ Nova refeição" active={selected === NEW_MEAL} onPress={() => setTarget(NEW_MEAL)} />
                </View>
              )}
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function Tile({ value, label, color }: { value: number | null; label: string; color: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileValue, { color }]}>{formatNumber(value ?? 0, 1)}</Text>
      <T variant="caption" style={{ fontSize: 11 }}>{label}</T>
    </View>
  );
}

function PortionCard({ food, grams }: { food: Food; grams: number }) {
  const p = per(food.proteinPer100g, grams);
  const c = per(food.carbsPer100g, grams);
  const f = per(food.fatPer100g, grams);
  return (
    <Card style={styles.section}>
      <View style={styles.portionHead}>
        <T variant="label">Nesta porção</T>
        <Text style={styles.portionKcal}>{formatNumber(per(food.caloriesPer100g, grams))} kcal</Text>
      </View>
      <MacroBar protein={p} carbs={c} fat={f} />
      <MacroInline protein={p} carbs={c} fat={f} size={12} gap={14} />
    </Card>
  );
}

function MealOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.mealOption, active && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}
    >
      <Text style={[styles.mealOptionText, active && { color: colors.accent, fontFamily: fonts.extrabold }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 },
  name: { fontFamily: fonts.title, fontSize: 24, letterSpacing: -0.5, lineHeight: 30, color: colors.text },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 4,
  },
  tileValue: { fontFamily: fonts.extrabold, fontSize: 15 },
  section: { gap: 14, padding: 18, borderRadius: 24 },
  qtyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 32 },
  portionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  portionKcal: { fontFamily: fonts.title, fontSize: 20, color: colors.text },
  mealChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealOption: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  mealOptionText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSoft },
});
