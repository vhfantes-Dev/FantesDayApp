import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { mealApi } from '@/api/endpoints';
import type { Meal, MealItem } from '@/api/types';
import { Icon } from '@/components/Icon';
import { MacroInline, QuantityStepper, Sheet, sumItems } from '@/components/nutrition/shared';
import { useToast } from '@/components/Toast';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
  MacroBar,
  Screen,
  SkeletonList,
  T,
} from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { addDays, formatNumber, relativeDate, shortDate } from '@/utils/format';

function mealTime(meal: Meal) {
  const m = /T(\d{2}:\d{2})/.exec(meal.createdAt ?? '');
  return m ? m[1] : '';
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/nutricao');
}

export default function RefeicaoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mealId = Number(id);
  const toast = useToast();
  const { data, error, loading, refreshing, refresh, reload, setData } = useApi(async () => {
    const [meal, items] = await Promise.all([mealApi.get(mealId), mealApi.items(mealId)]);
    return { meal, items };
  }, [mealId]);

  const [editingMeal, setEditingMeal] = useState(false);
  const [editingItem, setEditingItem] = useState<MealItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const addParams = { mealId: String(mealId) };

  function confirmRemoveItem(item: MealItem) {
    Alert.alert('Remover item', `Remover "${item.foodName}" desta refeição?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const prev = data;
          setData((d) => ({ ...d!, items: d!.items.filter((i) => i.id !== item.id) }));
          try {
            await mealApi.removeItem(item.id);
          } catch (e) {
            if (prev) setData(prev);
            toast.error(e instanceof Error ? e.message : 'Não foi possível remover o item.');
          }
        },
      },
    ]);
  }

  function confirmDeleteMeal() {
    Alert.alert('Excluir refeição', 'A refeição e todos os itens serão excluídos. Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await mealApi.remove(mealId);
            toast.success('Refeição excluída');
            goBack();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Não foi possível excluir a refeição.');
            setDeleting(false);
          }
        },
      },
    ]);
  }

  const meal = data?.meal;
  const items = data?.items ?? [];
  const total = sumItems(items);
  const time = meal ? mealTime(meal) : '';

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <IconButton icon="back" label="Voltar" onPress={goBack} />
        <Pressable
          style={styles.headerCenter}
          onPress={() => meal && setEditingMeal(true)}
          accessibilityRole="button"
          accessibilityLabel="Renomear refeição"
        >
          <Text style={styles.title} numberOfLines={1}>{meal?.name ?? 'Refeição'}</Text>
          {meal ? (
            <T variant="caption">
              {shortDate(meal.date)}
              {time ? ` · ${time}` : ''}
            </T>
          ) : null}
        </Pressable>
        <IconButton icon="calendar" label="Alterar nome e data" onPress={() => meal && setEditingMeal(true)} />
      </View>

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={3} /> : null}

      {data ? (
        <>
          <Card style={styles.totalCard}>
            <View style={styles.totalHead}>
              <T variant="label">Total da refeição</T>
              <Text style={styles.totalKcal}>
                {formatNumber(total.calories)}
                <Text style={styles.totalUnit}> kcal</Text>
              </Text>
            </View>
            <MacroBar protein={total.protein} carbs={total.carbs} fat={total.fat} />
            <View style={styles.macroGrid}>
              <MacroStat value={total.protein} label="Proteína" color={colors.protein} />
              <MacroStat value={total.carbs} label="Carboidratos" color={colors.carbs} />
              <MacroStat value={total.fat} label="Gordura" color={colors.fat} />
            </View>
          </Card>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Itens · {items.length}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Foto da refeição"
                hitSlop={6}
                onPress={() => router.push({ pathname: '/refeicoes/foto', params: addParams })}
                style={styles.scanBtn}
              >
                <Icon name="camera" size={18} color={colors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ler código de barras"
                hitSlop={6}
                onPress={() => router.push({ pathname: '/alimentos/scanner', params: addParams })}
                style={styles.scanBtn}
              >
                <Icon name="barcode" size={18} color={colors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/alimentos/buscar', params: addParams })}
                style={styles.addLink}
                hitSlop={6}
              >
                <Icon name="plus" size={16} color={colors.accent} strokeWidth={2.4} />
                <Text style={styles.addLinkText}>Adicionar item</Text>
              </Pressable>
            </View>
          </View>

          {items.length === 0 ? (
            <View style={{ gap: 10 }}>
              <EmptyState
                icon="apple"
                title="Refeição vazia"
                message="Busque um alimento, leia o código de barras ou fotografe o prato."
                action="Buscar alimento"
                onAction={() => router.push({ pathname: '/alimentos/buscar', params: addParams })}
              />
              <Button
                title="Foto da refeição"
                icon="camera"
                variant="secondary"
                small
                onPress={() => router.push({ pathname: '/refeicoes/foto', params: addParams })}
              />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {items.map((item) => (
                <ItemRow key={item.id} item={item} onEdit={() => setEditingItem(item)} onRemove={() => confirmRemoveItem(item)} />
              ))}
            </View>
          )}

          <Button title="Excluir refeição" variant="danger" onPress={confirmDeleteMeal} loading={deleting} style={{ marginTop: 8, height: 52 }} />
        </>
      ) : null}

      {meal ? (
        <EditMealSheet
          visible={editingMeal}
          meal={meal}
          onClose={() => setEditingMeal(false)}
          onSaved={(m) => {
            setData((d) => ({ ...d!, meal: m }));
            setEditingMeal(false);
            toast.success('Refeição atualizada');
          }}
        />
      ) : null}

      <EditItemSheet
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={(updated) => {
          setData((d) => ({ ...d!, items: d!.items.map((i) => (i.id === updated.id ? updated : i)) }));
          setEditingItem(null);
        }}
      />
    </Screen>
  );
}

function MacroStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={[styles.macroValue, { color }]}>{formatNumber(value, 1)} g</Text>
      <T variant="caption" style={{ fontSize: 11 }}>{label}</T>
    </View>
  );
}

function ItemRow({ item, onEdit, onRemove }: { item: MealItem; onEdit: () => void; onRemove: () => void }) {
  return (
    <Card style={styles.itemCard} padded={false}>
      <Pressable style={{ flex: 1, gap: 6 }} onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Editar quantidade de ${item.foodName}`}>
        <View style={styles.itemHead}>
          <Text style={styles.itemName} numberOfLines={2}>{item.foodName}</Text>
          <Text style={styles.itemKcal}>{formatNumber(item.calculatedCalories)} kcal</Text>
        </View>
        <MacroInline
          protein={item.calculatedProtein}
          carbs={item.calculatedCarbs}
          fat={item.calculatedFat}
          unit=""
          gap={10}
          prefix={<Text style={styles.itemQty}>{formatNumber(item.quantity)} {item.unit ?? 'g'}</Text>}
        />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Editar quantidade" onPress={onEdit} style={styles.editBtn}>
        <Icon name="edit" size={16} color={colors.text} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Remover item" onPress={onRemove} style={styles.removeBtn}>
        <Icon name="trash" size={16} color={colors.danger} />
      </Pressable>
    </Card>
  );
}

function EditItemSheet({ item, onClose, onSaved }: { item: MealItem | null; onClose: () => void; onSaved: (i: MealItem) => void }) {
  const toast = useToast();
  const [qty, setQty] = useState(0);
  const [saving, setSaving] = useState(false);
  const [forId, setForId] = useState<number | null>(null);

  // Reinicia a quantidade quando abre para outro item.
  if (item && forId !== item.id) {
    setForId(item.id);
    setQty(Math.round(item.quantity));
  }

  const ratio = item && item.quantity ? qty / item.quantity : 0;

  async function save() {
    if (!item) return;
    if (!qty || qty <= 0) {
      toast.error('Informe uma quantidade maior que zero.');
      return;
    }
    setSaving(true);
    try {
      const updated = await mealApi.updateItem(item.id, { foodId: item.foodId, quantity: qty, unit: item.unit ?? 'g' });
      onSaved(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      visible={!!item}
      onClose={() => {
        setForId(null);
        onClose();
      }}
      title={item?.foodName ?? 'Quantidade'}
    >
      {item ? (
        <>
          <QuantityStepper value={qty} onChange={setQty} unit={item.unit ?? 'g'} />
          <View style={styles.previewRow}>
            <T variant="label">Nesta porção</T>
            <Text style={styles.previewKcal}>{formatNumber(item.calculatedCalories * ratio)} kcal</Text>
          </View>
          <MacroInline
            protein={item.calculatedProtein * ratio}
            carbs={item.calculatedCarbs * ratio}
            fat={item.calculatedFat * ratio}
            size={12}
          />
          <Button title="Salvar quantidade" onPress={save} loading={saving} disabled={!qty} />
        </>
      ) : null}
    </Sheet>
  );
}

function EditMealSheet({ visible, meal, onClose, onSaved }: { visible: boolean; meal: Meal; onClose: () => void; onSaved: (m: Meal) => void }) {
  const toast = useToast();
  const [name, setName] = useState(meal.name);
  const [date, setDate] = useState(meal.date);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wasVisible, setWasVisible] = useState(false);

  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setName(meal.name);
      setDate(meal.date);
      setError(null);
    }
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Dê um nome para a refeição.');
      return;
    }
    if (trimmed.length > 100) {
      setError('Use no máximo 100 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const updated = await mealApi.update(meal.id, { name: trimmed, date });
      onSaved(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível salvar.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Editar refeição">
      <Field
        label="Nome"
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError(null);
        }}
        placeholder="Ex: Café da manhã"
        error={error}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={save}
        maxLength={100}
      />
      <View style={{ gap: 8 }}>
        <T variant="label">Data</T>
        <View style={styles.dateRow}>
          <IconButton icon="back" label="Dia anterior" onPress={() => setDate((d) => addDays(d, -1))} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.dateText}>{relativeDate(date)}</Text>
            <T variant="caption">{shortDate(date)}</T>
          </View>
          <IconButton icon="chevronRight" label="Próximo dia" onPress={() => setDate((d) => addDays(d, 1))} />
        </View>
      </View>
      <Button title="Salvar" onPress={save} loading={saving} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2, minHeight: 44, justifyContent: 'center' },
  title: { fontFamily: fonts.title, fontSize: 16, color: colors.text },
  totalCard: { gap: 12, padding: 18, borderRadius: 24 },
  totalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalKcal: { fontFamily: fonts.title, fontSize: 24, color: colors.text },
  totalUnit: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  macroGrid: { flexDirection: 'row', gap: 8 },
  macroValue: { fontFamily: fonts.extrabold, fontSize: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.title, fontSize: 15, color: colors.text },
  scanBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
  addLinkText: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.accent },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  itemName: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  itemKcal: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  itemQty: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted },
  editBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  previewKcal: { fontFamily: fonts.title, fontSize: 20, color: colors.text },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
});
