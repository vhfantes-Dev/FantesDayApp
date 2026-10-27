import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { goalApi } from '@/api/endpoints';
import type { WeightGoal } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { activityLevelInfo, bmiColor, factorLabel, MISSING_FIELD_LABELS, SEX_LABELS } from '@/components/conta/body';
import { BmiGauge } from '@/components/conta/charts';
import { FadeIn } from '@/components/conta/motion';
import { Icon, type IconName } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, Card, ErrorBanner, Header, IconButton, Screen, SkeletonList, T } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { formatDecimal, formatNumber } from '@/utils/format';

const GOALS: { value: WeightGoal; label: string; icon: IconName; flip?: boolean }[] = [
  { value: 'LOSE', label: 'Perder', icon: 'trendUp', flip: true },
  { value: 'MAINTAIN', label: 'Manter', icon: 'scale' },
  { value: 'GAIN', label: 'Ganhar', icon: 'trendUp' },
];

export default function MetabolismoScreen() {
  const userId = useUserId();
  const toast = useToast();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromOnboarding = from === 'onboarding';
  const { data, error, loading, refreshing, refresh, reload } = useApi(async () => {
    const [metrics, goals] = await Promise.all([goalApi.bodyMetrics(userId), goalApi.get(userId).catch(() => null)]);
    return { metrics, goals };
  }, [userId]);
  const [goal, setGoal] = useState<WeightGoal>('MAINTAIN');
  const [applying, setApplying] = useState(false);
  const picked = useRef(false);

  // Pré-seleciona o objetivo que bate com a meta atual.
  useEffect(() => {
    const s = data?.metrics.suggestedCalories;
    const current = data?.goals?.dailyCalories;
    if (!s || picked.current) return;
    picked.current = true;
    if (current === s.lose) setGoal('LOSE');
    else if (current === s.gain) setGoal('GAIN');
  }, [data]);

  function leave() {
    if (fromOnboarding) router.replace('/');
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function apply() {
    setApplying(true);
    try {
      const saved = await goalApi.applySuggestion(userId, goal);
      toast.success(`Meta aplicada · ${formatNumber(saved.dailyCalories)} kcal`);
      leave();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível aplicar a meta.');
    } finally {
      setApplying(false);
    }
  }

  const m = data?.metrics;
  const s = m?.suggestedCalories;
  const level = activityLevelInfo(m?.activityLevel);
  const kcalFor = (g: WeightGoal) => (s ? (g === 'LOSE' ? s.lose : g === 'GAIN' ? s.gain : s.maintain) : 0);
  const diffLabel = (g: WeightGoal) => {
    if (!s || !m?.tdee) return '';
    const diff = kcalFor(g) - m.tdee;
    if (diff === 0) return '= gasto';
    return `${diff > 0 ? '+' : '−'}${formatNumber(Math.abs(diff))} kcal`;
  };
  const ready = !!m && m.complete && !!s;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      contentStyle={{ gap: 12 }}
      footer={
        ready ? (
          <Button title={`Aplicar meta · ${formatNumber(kcalFor(goal))} kcal`} onPress={apply} loading={applying} />
        ) : fromOnboarding ? (
          <Button title="Ir para o início" variant="secondary" onPress={leave} />
        ) : undefined
      }
    >
      <Header
        title="Metabolismo e metas"
        onBack={leave}
        right={<IconButton icon="edit" label="Editar dados do corpo" onPress={() => router.push('/perfil/editar')} />}
      />

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <SkeletonList rows={4} /> : null}

      {m ? (
        <>
          <FadeIn style={styles.chips}>
            {m.weightKg ? <Pill label={`${formatDecimal(m.weightKg)} kg`} /> : null}
            {m.heightCm ? <Pill label={`${formatNumber(m.heightCm)} cm`} /> : null}
            {m.age !== null ? <Pill label={`${m.age} anos`} /> : null}
            {m.sex ? <Pill label={SEX_LABELS[m.sex]} /> : null}
            {level ? <Pill label={`${level.label} · ${factorLabel(level.factor)}`} /> : null}
          </FadeIn>

          {!m.complete ? (
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Icon name="alert" size={22} color={colors.carbs} />
                <T style={{ fontFamily: fonts.bold, flex: 1 }}>Faltam dados para calcular</T>
              </View>
              <T variant="caption" style={{ lineHeight: 18 }}>
                Precisamos destes dados do perfil para estimar seu gasto diário e sugerir metas:
              </T>
              <View style={{ gap: 6 }}>
                {m.missingFields.map((f) => (
                  <View key={f} style={styles.missing}>
                    <View style={styles.missingDot} />
                    <T style={{ fontSize: 14 }}>{MISSING_FIELD_LABELS[f] ?? f}</T>
                  </View>
                ))}
              </View>
              <Button title="Completar meus dados" onPress={() => router.push('/onboarding')} />
              <Button title="Editar perfil" variant="ghost" small onPress={() => router.push('/perfil/editar')} />
            </Card>
          ) : null}

          {m.bmi !== null ? (
            <Card style={styles.gauge}>
              <BmiGauge bmi={m.bmi} label={`IMC ${formatDecimal(m.bmi)}, ${m.bmiCategory ?? ''}`} />
              <Text style={styles.bmi}>{formatDecimal(m.bmi)}</Text>
              <Text style={[styles.bmiLabel, { color: bmiColor(m.bmi) }]}>IMC · {m.bmiCategory}</Text>
            </Card>
          ) : null}

          {m.bmr !== null || m.tdee !== null ? (
            <FadeIn delay={100} style={styles.row}>
              <Card style={styles.metric}>
                <Text style={styles.overline}>TMB</Text>
                <Text style={styles.metricValue}>{formatNumber(m.bmr)}</Text>
                <T variant="caption" style={{ fontSize: 11 }}>kcal em repouso</T>
              </Card>
              <Card style={styles.metric}>
                <Text style={styles.overline}>GASTO DIÁRIO</Text>
                <Text style={styles.metricValue}>{formatNumber(m.tdee)}</Text>
                <T variant="caption" style={{ fontSize: 11 }}>kcal com atividade</T>
              </Card>
            </FadeIn>
          ) : null}

          {ready ? (
            <>
              <Text style={[styles.overline, { fontSize: 12, marginTop: 4 }]}>QUAL É O SEU OBJETIVO?</Text>
              <View style={styles.row} accessibilityRole="radiogroup">
                {GOALS.map((g) => {
                  const active = goal === g.value;
                  return (
                    <Pressable
                      key={g.value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${g.label}, ${formatNumber(kcalFor(g.value))} kcal`}
                      onPress={() => setGoal(g.value)}
                      style={[styles.goal, active && styles.goalActive]}
                    >
                      <View style={g.flip ? { transform: [{ scaleY: -1 }] } : null}>
                        <Icon name={g.icon} size={22} color={active ? colors.accent : colors.textSoft} />
                      </View>
                      <Text style={[styles.goalLabel, active && { fontFamily: fonts.extrabold }]}>{g.label}</Text>
                      <Text style={styles.goalKcal}>{formatNumber(kcalFor(g.value))}</Text>
                      <Text style={[styles.goalDiff, active && { color: colors.textLabel }]}>{diffLabel(g.value)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {m.suggestedProteinG ? (
                <View style={styles.protein}>
                  <Text style={styles.proteinValue}>{formatNumber(m.suggestedProteinG)} g</Text>
                  <T variant="caption" color="#A9B8DA" style={{ flex: 1, lineHeight: 17 }}>
                    de proteína por dia · 1,6 g por kg de peso
                  </T>
                </View>
              ) : null}

              {data?.goals?.dailyCalories ? (
                <T variant="caption" style={{ textAlign: 'center' }}>
                  Meta atual: {formatNumber(data.goals.dailyCalories)} kcal
                </T>
              ) : null}
            </>
          ) : null}

          <T variant="caption" style={{ textAlign: 'center', fontSize: 11, color: colors.textDone, lineHeight: 16 }}>
            Cálculo Mifflin-St Jeor. A meta para perder nunca fica abaixo de 1.500 kcal (1.200 para mulheres).
          </T>
        </>
      ) : null}
    </Screen>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: colors.surface2 },
  pillText: { fontFamily: fonts.bold, fontSize: 12, color: colors.text },
  missing: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  missingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.carbs },
  gauge: { alignItems: 'center', paddingTop: 14, paddingBottom: 12, borderRadius: 22 },
  bmi: { marginTop: -6, fontFamily: fonts.display, fontSize: 28, color: colors.text },
  bmiLabel: { fontFamily: fonts.extrabold, fontSize: 13 },
  row: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, padding: 14, borderRadius: 18, gap: 4 },
  overline: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.9, color: colors.textMuted },
  metricValue: { fontFamily: fonts.title, fontSize: 20, color: colors.text },
  goal: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 4,
  },
  goalActive: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSoft },
  goalLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  goalKcal: { fontFamily: fonts.title, fontSize: 15, color: colors.text },
  goalDiff: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  protein: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.proteinSoft,
    borderWidth: 1,
    borderColor: '#26345A',
  },
  proteinValue: { fontFamily: fonts.title, fontSize: 18, color: colors.protein },
});
