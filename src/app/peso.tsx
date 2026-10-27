import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { goalApi, trackingApi } from '@/api/endpoints';
import type { WeightEntry } from '@/api/types';
import { useAuth, useUserId } from '@/auth/AuthContext';
import { bmiColor } from '@/components/conta/body';
import { WeightChart } from '@/components/conta/charts';
import { FadeIn } from '@/components/conta/motion';
import { Segmented } from '@/components/rotina/Segmented';
import { useToast } from '@/components/Toast';
import { Button, Card, EmptyState, ErrorBanner, Header, IconButton, Screen, SkeletonList, T } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';
import { addDays, formatDecimal, parseNumber, shortDate, today } from '@/utils/format';

type Period = '30' | '90' | '365';
const PERIOD_LABEL: Record<Period, string> = { '30': '30 dias', '90': '90 dias', '365': '1 ano' };

export default function PesoScreen() {
  const userId = useUserId();
  const { refreshUser } = useAuth();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>('90');
  const todayIso = today();

  const { data, error, loading, refreshing, refresh, reload } = useApi(
    () => trackingApi.weights(userId, addDays(todayIso, -Number(period)), todayIso),
    [userId, period],
  );
  const metrics = useApi(() => goalApi.bodyMetrics(userId).catch(() => null), [userId]);

  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // Começa o campo com o peso atual.
  useEffect(() => {
    if (!input && data?.currentWeightKg) setInput(formatDecimal(data.currentWeightKg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.currentWeightKg]);

  const entries = [...(data?.entries ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  const desc = [...entries].reverse();
  const change = data?.changeKg ?? null;

  function step(delta: number) {
    const current = parseNumber(input) ?? data?.currentWeightKg ?? 70;
    const next = Math.round((current + delta) * 10) / 10;
    setInput(formatDecimal(Math.max(20, Math.min(400, next))));
    setInputError(null);
  }

  async function save() {
    const kg = parseNumber(input);
    if (kg === undefined || kg < 20 || kg > 400) {
      setInputError('Informe um peso entre 20 e 400 kg.');
      return;
    }
    setSaving(true);
    try {
      await trackingApi.addWeight(userId, Math.round(kg * 10) / 10);
      toast.success(`Peso de hoje registrado · ${formatDecimal(kg)} kg`);
      await Promise.all([reload(), metrics.reload(), refreshUser().catch(() => {})]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível registrar o peso.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(entry: WeightEntry) {
    Alert.alert('Excluir registro?', `${formatDecimal(entry.weightKg)} kg em ${shortDate(entry.date)}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await trackingApi.removeWeight(entry.id);
            toast.success('Registro excluído');
            await Promise.all([reload(), metrics.reload(), refreshUser().catch(() => {})]);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Não foi possível excluir.');
          }
        },
      },
    ]);
  }

  const bmi = metrics.data?.bmi ?? null;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} contentStyle={{ gap: 14 }}>
      <Header
        title="Peso corporal"
        right={<IconButton icon="flame" label="Metabolismo" onPress={() => router.push('/metabolismo')} />}
      />

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={3} /> : null}

      {data ? (
        <>
          <FadeIn style={styles.summary}>
            <View style={{ gap: 4 }}>
              <Text style={styles.overline}>ATUAL</Text>
              <Text style={styles.current}>
                {data.currentWeightKg ? formatDecimal(data.currentWeightKg) : '–'}
                <Text style={styles.currentUnit}> kg</Text>
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6, flexShrink: 1 }}>
              {change !== null && entries.length > 1 ? (
                <View style={[styles.change, change > 0 && { backgroundColor: colors.carbsSoft }]}>
                  <Text style={[styles.changeText, change > 0 && { color: colors.carbs }]}>
                    {change === 0 ? '=' : change < 0 ? '↓' : '↑'} {formatDecimal(Math.abs(change))} kg em {PERIOD_LABEL[period]}
                  </Text>
                </View>
              ) : null}
              {bmi !== null ? (
                <T variant="caption">
                  IMC {formatDecimal(bmi)} · <Text style={{ color: bmiColor(bmi) }}>{metrics.data?.bmiCategory}</Text>
                </T>
              ) : null}
            </View>
          </FadeIn>

          <Segmented
            value={period}
            onChange={setPeriod}
            options={(['30', '90', '365'] as Period[]).map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
          />

          {entries.length ? (
            <Card style={styles.chartCard} padded={false}>
              <WeightChart entries={entries} />
            </Card>
          ) : (
            <EmptyState icon="scale" title="Nenhum registro no período" message="Registre seu peso hoje para começar o gráfico." />
          )}
        </>
      ) : null}

      <FadeIn delay={200}>
        <Card style={{ gap: 12, borderRadius: 22 }}>
          <T style={{ fontFamily: fonts.extrabold, fontSize: 14 }}>Registrar peso de hoje</T>
          <View style={styles.stepper}>
            <Pressable accessibilityRole="button" accessibilityLabel="Diminuir 0,1 kg" onPress={() => step(-0.1)} style={styles.stepButton}>
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <TextInput
              value={input}
              onChangeText={(t) => {
                setInput(t.replace(/[^\d.,]/g, ''));
                setInputError(null);
              }}
              keyboardType="decimal-pad"
              maxLength={6}
              placeholder="78,0"
              placeholderTextColor={colors.textDone}
              selectionColor={colors.accent}
              accessibilityLabel="Peso em kg"
              style={[styles.input, inputError ? { borderColor: colors.danger } : null]}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Aumentar 0,1 kg" onPress={() => step(0.1)} style={styles.stepButton}>
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
          {inputError ? <T variant="caption" color={colors.danger}>{inputError}</T> : null}
          <Button title="Salvar · atualiza o perfil" onPress={save} loading={saving} style={{ height: 50, borderRadius: 16 }} />
          <T variant="caption" style={{ fontSize: 11 }}>Registrar de novo no mesmo dia substitui o valor.</T>
        </Card>
      </FadeIn>

      {desc.length ? (
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {desc.map((e, i) => {
            const prev = desc[i + 1];
            const delta = prev ? Math.round((e.weightKg - prev.weightKg) * 10) / 10 : null;
            return (
              <View key={e.id} style={[styles.entry, i < desc.length - 1 && styles.entryBorder]}>
                <T variant="caption" style={{ flex: 1, fontSize: 13 }}>{e.date === todayIso ? 'Hoje' : shortDate(e.date)}</T>
                <Text style={styles.entryValue}>{formatDecimal(e.weightKg)} kg</Text>
                <Text style={[styles.delta, delta !== null && delta > 0 && { color: colors.carbs }]}>
                  {delta === null || delta === 0 ? '' : `${delta > 0 ? '+' : '−'}${formatDecimal(Math.abs(delta))}`}
                </Text>
                <IconButton
                  icon="trash"
                  label={`Excluir ${formatDecimal(e.weightKg)} kg de ${shortDate(e.date)}`}
                  color={colors.textMuted}
                  size={36}
                  onPress={() => confirmDelete(e)}
                  style={{ borderWidth: 0, backgroundColor: 'transparent' }}
                />
              </View>
            );
          })}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  overline: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1, color: colors.textMuted },
  current: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: colors.text },
  currentUnit: { fontSize: 18, color: colors.textMuted },
  change: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: colors.accentSoft },
  changeText: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.accent },
  chartCard: { paddingTop: 14, paddingRight: 10, paddingBottom: 8, paddingLeft: 6, borderRadius: 22 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: radius.icon,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: fonts.semibold, fontSize: 20, color: colors.text },
  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderRadius: radius.icon,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: fonts.title,
    fontSize: 20,
    textAlign: 'center',
  },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16, paddingRight: 6, paddingVertical: 4, minHeight: 48 },
  entryBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  entryValue: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.text },
  delta: { width: 44, textAlign: 'right', fontFamily: fonts.bold, fontSize: 12, color: colors.accent },
});
