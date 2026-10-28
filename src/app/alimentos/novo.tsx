import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { foodApi } from '@/api/endpoints';
import type { Food, FoodRequest } from '@/api/types';
import { NumberField } from '@/components/nutrition/shared';
import { useToast } from '@/components/Toast';
import { Button, Card, ErrorBanner, Field, IconButton, LoadingView, Screen, T, Toggle } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { parseNumber } from '@/utils/format';

type NumKey = 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'density';
type Errors = Partial<Record<NumKey | 'name', string>>;

function toText(n: number | null | undefined) {
  return n === null || n === undefined ? '' : String(n).replace('.', ',');
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/alimentos/buscar');
}

export default function NovoAlimentoScreen() {
  const { id, mealId } = useLocalSearchParams<{ id?: string; mealId?: string }>();
  const editId = id ? Number(id) : null;
  const toast = useToast();
  const existing = useApi(() => foodApi.get(editId!), [editId], { enabled: editId !== null });

  const [name, setName] = useState('');
  const [liquid, setLiquid] = useState(false);
  const [nums, setNums] = useState<Record<NumKey, string>>({ kcal: '', protein: '', carbs: '', fat: '', fiber: '', density: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [loadedFor, setLoadedFor] = useState<number | null>(null);

  // Preenche o formulário uma vez ao editar.
  const food = existing.data;
  if (food && loadedFor !== food.id) {
    setLoadedFor(food.id);
    fill(food);
  }

  function fill(f: Food) {
    setName(f.name);
    setLiquid(f.liquid || f.defaultUnit === 'ml');
    setNums({
      kcal: toText(f.caloriesPer100g),
      protein: toText(f.proteinPer100g),
      carbs: toText(f.carbsPer100g),
      fat: toText(f.fatPer100g),
      fiber: toText(f.fiberPer100g),
      density: toText(f.densityGPerMl),
    });
  }

  function setNum(key: NumKey, text: string) {
    setNums((n) => ({ ...n, [key]: text.replace(/[^\d.,]/g, '') }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): FoodRequest | null {
    const e: Errors = {};
    const trimmed = name.trim();
    if (trimmed.length < 2) e.name = 'Informe o nome do alimento.';
    else if (trimmed.length > 150) e.name = 'Use no máximo 150 caracteres.';

    const values: Partial<Record<NumKey, number>> = {};
    (Object.keys(nums) as NumKey[]).forEach((k) => {
      const raw = nums[k].trim();
      if (k === 'density' && !liquid) return;
      if (!raw) {
        if (k === 'kcal') e.kcal = 'Informe as calorias.';
        return;
      }
      const n = parseNumber(raw);
      if (n === undefined || n < 0) e[k] = 'Valor inválido.';
      else if (k === 'kcal' && n > 900) e.kcal = 'Máximo de 900 kcal por 100 g.';
      else if (k === 'density' && (n < 0.3 || n > 2.5)) e.density = 'Use um valor entre 0,3 e 2,5 g/ml.';
      else if (k !== 'kcal' && k !== 'density' && n > 100) e[k] = 'Máximo de 100 g.';
      else values[k] = n;
    });
    const macroSum = (values.protein ?? 0) + (values.carbs ?? 0) + (values.fat ?? 0);
    if (!e.protein && !e.carbs && !e.fat && macroSum > 100) e.carbs = 'Proteína + carboidratos + gordura passam de 100 g.';

    setErrors(e);
    if (Object.values(e).some(Boolean)) return null;
    return {
      name: trimmed,
      defaultUnit: liquid ? 'ml' : 'g',
      liquid,
      ...(liquid && values.density !== undefined ? { densityGPerMl: values.density } : {}),
      caloriesPer100g: values.kcal,
      proteinPer100g: values.protein ?? 0,
      carbsPer100g: values.carbs ?? 0,
      fatPer100g: values.fat ?? 0,
      fiberPer100g: values.fiber ?? 0,
    };
  }

  async function save() {
    const body = validate();
    if (!body) return;
    setSaving(true);
    try {
      if (editId !== null) {
        await foodApi.update(editId, body);
        toast.success('Alimento atualizado');
        close();
      } else {
        const created = await foodApi.create(body);
        toast.success('Alimento cadastrado');
        router.replace({ pathname: '/alimentos/[id]', params: { id: String(created.id), ...(mealId ? { mealId } : {}) } });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível salvar.';
      toast.error(msg);
      setSaving(false);
    }
  }

  const editing = editId !== null;

  return (
    <Screen footer={<Button title="Salvar alimento" onPress={save} loading={saving} disabled={editing && !food} />}>
      <View style={styles.header}>
        <IconButton icon="close" label="Fechar" onPress={close} />
        <Text style={styles.title}>{editing ? 'Editar alimento' : 'Novo alimento'}</Text>
        <View style={{ width: 44 }} />
      </View>

      {editing && existing.error && !food ? <ErrorBanner message={existing.error.message} onRetry={existing.reload} /> : null}
      {editing && existing.loading && !food ? <LoadingView /> : null}

      {!editing || food ? (
        <>
          <Field
            label="Nome"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setErrors((e) => ({ ...e, name: undefined }));
            }}
            placeholder="Ex: Panqueca de banana caseira"
            error={errors.name}
            maxLength={150}
            autoCapitalize="sentences"
          />

          <Card style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.cardTitle}>Líquido</Text>
                <T variant="caption">Sucos, leites, óleos, bebidas… Medido em ml por padrão.</T>
              </View>
              <Toggle
                label="Líquido"
                value={liquid}
                onChange={(v) => {
                  setLiquid(v);
                  setErrors((e) => ({ ...e, density: undefined }));
                }}
              />
            </View>
            {liquid ? (
              <NumberField
                label="Densidade (g/ml) · opcional"
                value={nums.density}
                onChangeText={(t) => setNum('density', t)}
                placeholder="1,0"
                error={errors.density}
              />
            ) : null}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Informação nutricional por 100 g</Text>
            <NumberField label="Calorias (kcal)" value={nums.kcal} onChangeText={(t) => setNum('kcal', t)} placeholder="0" error={errors.kcal} />
            <View style={styles.grid}>
              <NumberField style={styles.cell} label="Proteína (g)" labelColor={colors.protein} value={nums.protein} onChangeText={(t) => setNum('protein', t)} placeholder="0" error={errors.protein} />
              <NumberField style={styles.cell} label="Carboidratos (g)" labelColor={colors.carbs} value={nums.carbs} onChangeText={(t) => setNum('carbs', t)} placeholder="0" error={errors.carbs} />
            </View>
            <View style={styles.grid}>
              <NumberField style={styles.cell} label="Gordura (g)" labelColor={colors.fat} value={nums.fat} onChangeText={(t) => setNum('fat', t)} placeholder="0" error={errors.fat} />
              <NumberField style={styles.cell} label="Fibra (g)" labelColor={colors.textSoft} value={nums.fiber} onChangeText={(t) => setNum('fiber', t)} placeholder="0" error={errors.fiber} />
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 },
  title: { fontFamily: fonts.title, fontSize: 16, color: colors.text },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textLabel },
  card: { gap: 12, borderRadius: 22 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  grid: { flexDirection: 'row', gap: 10 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cell: { flex: 1 },
});
