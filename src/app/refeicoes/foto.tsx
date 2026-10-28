import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { mealApi } from '@/api/endpoints';
import { appendFile } from '@/api/upload';
import type { MealPhotoAnalysis } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { MacroInline, QuantityStepper } from '@/components/nutrition/shared';
import { useReduceMotion } from '@/components/rank/motion';
import { useToast } from '@/components/Toast';
import { Button, Card, Checkbox, ErrorBanner, Field, IconButton, LoadingView, MacroBar, Screen, T, Tag } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';
import { formatNumber, today } from '@/utils/format';

type Item = MealPhotoAnalysis['items'][number];
interface Pick {
  uri: string;
  name: string;
  type: string;
}
interface ItemState {
  checked: boolean;
  grams: number;
}

const MAX_BYTES = 10 * 1024 * 1024;
const NEW_MEAL = 'new';

const CONFIDENCE: Record<string, { label: string; tone: 'accent' | 'warn' | 'danger' }> = {
  ALTA: { label: 'ALTA', tone: 'accent' },
  MEDIA: { label: 'MÉDIA', tone: 'warn' },
  BAIXA: { label: 'BAIXA', tone: 'danger' },
};

function basePortion(item: Item) {
  return item.portionGrams && item.portionGrams > 0 ? item.portionGrams : 100;
}

function scaled(item: Item, grams: number) {
  const r = grams / basePortion(item);
  return {
    calories: (item.calories ?? 0) * r,
    protein: (item.protein ?? 0) * r,
    carbs: (item.carbs ?? 0) * r,
    fat: (item.fat ?? 0) * r,
  };
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/nutricao');
}

export default function FotoRefeicaoScreen() {
  const { mealId } = useLocalSearchParams<{ mealId?: string }>();
  const userId = useUserId();
  const toast = useToast();

  const [photo, setPhoto] = useState<Pick | null>(null);
  const [description, setDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MealPhotoAnalysis | null>(null);
  const [state, setState] = useState<ItemState[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Sem mealId: escolher uma refeição de hoje (ou criar nova).
  const meals = useApi(() => mealApi.list(userId, today()), [userId], { enabled: !mealId });
  const [target, setTarget] = useState<string | null>(null);
  const selected = mealId ?? target ?? (meals.data?.length ? String(meals.data[meals.data.length - 1].id) : NEW_MEAL);

  async function pick(source: 'camera' | 'library') {
    try {
      if (source === 'camera' && Platform.OS !== 'web') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Câmera bloqueada', 'Permita o acesso à câmera para fotografar a refeição.', [
            { text: 'Cancelar', style: 'cancel' },
            ...(perm.canAskAgain ? [] : [{ text: 'Abrir ajustes', onPress: () => void Linking.openSettings() }]),
          ]);
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
      const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (res.canceled || !res.assets.length) return;
      const asset = res.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_BYTES) {
        toast.error('A foto passa de 10 MB. Escolha uma imagem menor.');
        return;
      }
      const type = asset.mimeType ?? 'image/jpeg';
      const ext = (type.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
      setPhoto({ uri: asset.uri, name: asset.fileName ?? `refeicao.${ext}`, type });
      setResult(null);
      setState([]);
      setError(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível abrir a imagem.');
    }
  }

  async function analyze() {
    if (!photo) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      await appendFile(form, 'file', photo);
      const desc = description.trim();
      if (desc) form.append('description', desc);
      const res = await mealApi.analyzePhoto(form);
      setResult(res);
      setState(res.items.map((i) => ({ checked: i.foodId !== null, grams: Math.round(basePortion(i)) })));
      setExpanded(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 413) setError('A foto passa de 10 MB. Escolha uma imagem menor.');
      else setError(e instanceof Error ? e.message : 'Não foi possível analisar a foto.');
    } finally {
      setAnalyzing(false);
    }
  }

  function update(i: number, patch: Partial<ItemState>) {
    setState((s) => s.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  const chosen = result ? result.items.map((item, i) => ({ item, st: state[i] })).filter((x) => x.st?.checked && x.item.foodId !== null) : [];

  async function save() {
    if (!chosen.length) return;
    setSaving(true);
    let targetId = selected;
    try {
      if (targetId === NEW_MEAL) {
        const meal = await mealApi.create(userId, { date: today() });
        targetId = String(meal.id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível criar a refeição.');
      setSaving(false);
      return;
    }
    let added = 0;
    const failed: string[] = [];
    for (const { item, st } of chosen) {
      try {
        await mealApi.addItem(Number(targetId), { foodId: item.foodId!, quantity: st.grams, unit: 'g' });
        added++;
      } catch {
        failed.push(item.name);
      }
    }
    setSaving(false);
    if (added) toast.success(`${added} ${added === 1 ? 'item adicionado' : 'itens adicionados'} à refeição`);
    if (failed.length) {
      toast.error(`Não foi possível adicionar: ${failed.join(', ')}`);
      if (!added) return;
    }
    if (mealId) router.dismissTo({ pathname: '/refeicoes/[id]', params: { id: mealId } });
    else router.replace({ pathname: '/refeicoes/[id]', params: { id: targetId } });
  }

  const totals = result
    ? result.items.reduce(
        (acc, item, i) => {
          if (!state[i]?.checked) return acc;
          const v = scaled(item, state[i].grams);
          return { calories: acc.calories + v.calories, protein: acc.protein + v.protein, carbs: acc.carbs + v.carbs, fat: acc.fat + v.fat };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      )
    : null;

  const footer = result ? (
    <Button
      title={chosen.length ? `Adicionar ${chosen.length} ${chosen.length === 1 ? 'item' : 'itens'} à refeição` : 'Selecione itens para adicionar'}
      onPress={save}
      loading={saving}
      disabled={!chosen.length}
    />
  ) : photo ? (
    <Button title={analyzing ? 'Analisando…' : 'Analisar'} icon="sparkles" onPress={analyze} loading={analyzing} />
  ) : undefined;

  return (
    <Screen footer={footer}>
      <View style={styles.header}>
        <IconButton icon="back" label="Voltar" onPress={goBack} />
        <Text style={styles.title}>Foto da refeição</Text>
        <View style={{ width: 44 }} />
      </View>

      {!photo ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="camera" size={28} color={colors.accent} />
          </View>
          <T style={{ fontFamily: fonts.bold, fontSize: 16, textAlign: 'center' }}>Fotografe o seu prato</T>
          <T variant="caption" style={{ fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
            A IA identifica os alimentos e estima porções, calorias e macros. Você confere tudo antes de salvar.
          </T>
          <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 6 }}>
            <Button title="Tirar foto" icon="camera" onPress={() => void pick('camera')} />
            <Button title="Escolher da galeria" icon="image" variant="secondary" onPress={() => void pick('library')} />
          </View>
        </View>
      ) : (
        <>
          <PhotoPreview uri={photo.uri} scanning={analyzing} />
          {!analyzing ? (
            <View style={styles.photoActions}>
              <Button title="Tirar outra" icon="camera" variant="secondary" small style={{ flex: 1 }} onPress={() => void pick('camera')} />
              <Button title="Galeria" icon="image" variant="secondary" small style={{ flex: 1 }} onPress={() => void pick('library')} />
            </View>
          ) : null}
          {!result ? (
            <Field
              label="Descrição (opcional)"
              value={description}
              onChangeText={setDescription}
              placeholder="ex: arroz integral e frango"
              maxLength={300}
              editable={!analyzing}
              hint="Ajuda a IA a acertar os alimentos e o preparo."
            />
          ) : null}
        </>
      )}

      {error ? <ErrorBanner title="Não foi possível analisar" message={error} onRetry={photo ? analyze : undefined} /> : null}

      {result && totals ? (
        <>
          <View style={styles.disclaimer}>
            <Icon name="sparkles" size={18} color={colors.carbs} />
            <Text style={styles.disclaimerText}>Estimativa por IA — confira as porções antes de salvar</Text>
          </View>

          <Card style={styles.totalCard}>
            <View style={styles.totalHead}>
              <T variant="label">Itens selecionados</T>
              <Text style={styles.totalKcal}>
                {formatNumber(totals.calories)}
                <Text style={styles.totalUnit}> kcal</Text>
              </Text>
            </View>
            <MacroBar protein={totals.protein} carbs={totals.carbs} fat={totals.fat} />
            <MacroInline protein={totals.protein} carbs={totals.carbs} fat={totals.fat} size={12} gap={14} />
            {result.description ? <T variant="caption" style={{ fontSize: 13, lineHeight: 19 }}>{result.description}</T> : null}
          </Card>

          {result.items.length === 0 ? (
            <ErrorBanner title="Nenhum alimento reconhecido" message="Tente outra foto, mais de perto e com boa luz, ou descreva o prato." />
          ) : (
            <View style={{ gap: 10 }}>
              {result.items.map((item, i) => (
                <ResultItem
                  key={`${item.name}-${i}`}
                  item={item}
                  st={state[i]}
                  expanded={expanded === i}
                  onToggle={() => update(i, { checked: !state[i].checked })}
                  onExpand={() => setExpanded((e) => (e === i ? null : i))}
                  onGrams={(g) => update(i, { grams: g })}
                  onSearch={() => router.push({ pathname: '/alimentos/buscar', params: { q: item.name, ...(mealId ? { mealId } : {}) } })}
                />
              ))}
            </View>
          )}

          {result.notes ? (
            <View style={styles.notes}>
              <Icon name="alert" size={16} color={colors.textMuted} />
              <T variant="caption" style={{ flex: 1, fontSize: 12, lineHeight: 18 }}>{result.notes}</T>
            </View>
          ) : null}

          {!mealId && chosen.length ? (
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

function PhotoPreview({ uri, scanning }: { uri: string; scanning: boolean }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  const [h, setH] = useState(0);

  useEffect(() => {
    if (!scanning || reduce !== false) return;
    v.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanning, reduce, v]);

  return (
    <View style={styles.photoWrap} onLayout={(e) => setH(e.nativeEvent.layout.height)} accessibilityLabel="Foto da refeição" accessible>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      {scanning ? (
        <View style={styles.scanOverlay}>
          {reduce === false ? (
            <Animated.View
              style={[styles.scanLine, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, Math.max(8, h - 10)] }) }] }]}
            />
          ) : null}
          <View style={styles.scanLabel}>
            <Icon name="sparkles" size={16} color={colors.accent} />
            <Text style={styles.scanText}>Analisando a foto…</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ResultItem({
  item,
  st,
  expanded,
  onToggle,
  onExpand,
  onGrams,
  onSearch,
}: {
  item: Item;
  st: ItemState | undefined;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onGrams: (g: number) => void;
  onSearch: () => void;
}) {
  if (!st) return null;
  const v = scaled(item, st.grams);
  const conf = item.confidence ? CONFIDENCE[item.confidence.toUpperCase()] : undefined;
  const matched = item.foodId !== null;
  return (
    <Card style={[styles.item, !st.checked && { opacity: matched ? 0.7 : 1 }]}>
      <View style={styles.itemTop}>
        {matched ? (
          <Checkbox checked={st.checked} onPress={onToggle} label={`Incluir ${item.name}`} />
        ) : (
          <View style={styles.noMatchIcon}>
            <Icon name="alert" size={14} color={colors.textMuted} />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.itemHead}>
            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.itemKcal}>{formatNumber(v.calories)} kcal</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {conf ? <Tag label={`CONFIANÇA ${conf.label}`} tone={conf.tone} /> : null}
          </View>
          <MacroInline
            protein={v.protein}
            carbs={v.carbs}
            fat={v.fat}
            unit=""
            gap={10}
            prefix={<Text style={styles.itemQty}>{formatNumber(st.grams)} g</Text>}
          />
          {matched ? (
            <T variant="caption" numberOfLines={2}>Catálogo: {item.foodName}</T>
          ) : (
            <Pressable accessibilityRole="link" onPress={onSearch} hitSlop={8} style={{ paddingVertical: 6, alignSelf: 'flex-start' }}>
              <Text style={styles.searchLink}>Sem correspondência · Buscar no catálogo</Text>
            </Pressable>
          )}
        </View>
        {matched ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Fechar edição da porção' : `Editar porção de ${item.name}`}
            onPress={onExpand}
            style={[styles.editBtn, expanded && { backgroundColor: colors.accentSoft }]}
          >
            <Icon name={expanded ? 'check' : 'edit'} size={16} color={expanded ? colors.accent : colors.text} />
          </Pressable>
        ) : null}
      </View>
      {expanded && matched ? (
        <View style={{ paddingTop: 4 }}>
          <QuantityStepper value={st.grams} onChange={onGrams} unit="g" />
        </View>
      ) : null}
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
  title: { fontFamily: fonts.title, fontSize: 16, color: colors.text },
  empty: {
    alignItems: 'center',
    gap: 10,
    padding: 22,
    borderRadius: radius.cardLg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
  },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  photoWrap: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.cardLg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  photoActions: { flexDirection: 'row', gap: 10 },
  scanOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10,12,15,0.45)', justifyContent: 'flex-end', padding: 14 },
  scanLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
    height: 2,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  scanLabel: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 99,
    backgroundColor: 'rgba(10,12,15,0.85)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanText: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.carbsSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  totalCard: { gap: 12, padding: 18, borderRadius: 24 },
  totalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalKcal: { fontFamily: fonts.title, fontSize: 24, color: colors.text },
  totalUnit: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  item: { gap: 8, padding: 14 },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  noMatchIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  itemName: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  itemKcal: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  itemQty: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted },
  searchLink: { fontFamily: fonts.bold, fontSize: 12, color: colors.accent },
  editBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  notes: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
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
