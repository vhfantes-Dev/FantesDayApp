import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { trackingApi } from '@/api/endpoints';
import type { WaterEntry } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { NumberField, Sheet } from '@/components/nutrition/shared';
import { WATER, WaterGlass } from '@/components/nutrition/WaterGlass';
import { useReduceMotion } from '@/components/rank/motion';
import { useToast } from '@/components/Toast';
import { Button, EmptyState, ErrorBanner, IconButton, LoadingView, Screen, T } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { addDays, formatNumber, parseNumber, shortDate, today } from '@/utils/format';

const QUICK = [200, 300, 500];

function dayLabel(date: string) {
  const t = today();
  const prefix = date === t ? 'Hoje' : date === addDays(t, -1) ? 'Ontem' : null;
  return prefix ? `${prefix} · ${shortDate(date)}` : shortDate(date);
}

function entryTime(e: WaterEntry) {
  const m = /T(\d{2}:\d{2})/.exec(e.createdAt ?? '');
  return m ? m[1] : '';
}

export default function AguaScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today();
  const userId = useUserId();
  const toast = useToast();
  const reduceMotion = useReduceMotion();
  const { data, error, loading, refreshing, refresh, reload, setData } = useApi(() => trackingApi.water(userId, date), [userId, date]);

  const [adding, setAdding] = useState<number | null>(null);
  const [lastAmount, setLastAmount] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  async function add(ml: number) {
    setAdding(ml);
    try {
      const water = await trackingApi.addWater(userId, ml, date);
      setData(water);
      setLastAmount(ml);
      toast.success(`+${formatNumber(ml)} ml de água`);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível registrar a água.');
      return false;
    } finally {
      setAdding(null);
    }
  }

  async function addCustom() {
    const n = parseNumber(custom);
    if (!n || n <= 0) {
      setCustomError('Informe a quantidade em ml.');
      return;
    }
    if (n > 3000) {
      setCustomError('Máximo de 3.000 ml por registro.');
      return;
    }
    if (await add(Math.round(n))) {
      setCustomOpen(false);
      setCustom('');
    }
  }

  function confirmRemove(entry: WaterEntry) {
    const time = entryTime(entry);
    Alert.alert('Excluir registro', `Excluir ${formatNumber(entry.amountMl)} ml${time ? ` das ${time}` : ''}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const prev = data;
          setData((d) => {
            const entries = d!.entries.filter((e) => e.id !== entry.id);
            const totalMl = d!.totalMl - entry.amountMl;
            return { ...d!, entries, totalMl, percent: d!.goalMl ? (totalMl / d!.goalMl) * 100 : d!.percent };
          });
          try {
            await trackingApi.removeWater(entry.id);
            void reload();
          } catch (e) {
            if (prev) setData(prev);
            toast.error(e instanceof Error ? e.message : 'Não foi possível excluir o registro.');
          }
        },
      },
    ]);
  }

  const goal = data?.goalMl ?? null;
  const pct = data ? (goal ? (data.totalMl / goal) * 100 : 0) : 0;
  const missing = goal && data ? goal - data.totalMl : null;
  const entries = data ? [...data.entries].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')) : [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} glow="none" contentStyle={{ gap: 14 }}>
      <View pointerEvents="none" style={styles.glow} />
      <View style={styles.header}>
        <IconButton icon="back" label="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text style={styles.title}>Água</Text>
          <T variant="caption">{dayLabel(date)}</T>
        </View>
        <IconButton
          icon="target"
          label="Meta de água"
          onPress={() => router.push(goal ? '/metabolismo' : '/perfil/editar')}
        />
      </View>

      {error && !data ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !data ? <LoadingView /> : null}

      {data ? (
        <>
          <View style={styles.glassWrap} accessible accessibilityLabel={`${formatNumber(data.totalMl)} de ${goal ? `${formatNumber(goal)} ml` : 'ml'}${goal ? `, ${Math.round(pct)}%` : ''}`}>
            <WaterGlass width={200} percent={goal ? pct : Math.min(100, (data.totalMl / 2500) * 100)} background={colors.bg} animate={reduceMotion === false} />
            <View style={styles.count} pointerEvents="none">
              <Text style={styles.pct}>{goal ? `${formatNumber(Math.round(pct))}%` : `${formatNumber(data.totalMl)}`}</Text>
              <Text style={styles.countSub}>{goal ? `${formatNumber(data.totalMl)} / ${formatNumber(goal)} ml` : 'ml hoje'}</Text>
            </View>
          </View>

          {!goal ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/perfil/editar')} style={styles.goalCta}>
              <Icon name="target" size={20} color={WATER.light} />
              <Text style={styles.goalCtaText}>Defina uma meta diária de água</Text>
              <Icon name="chevronRight" size={18} color={WATER.muted} />
            </Pressable>
          ) : null}

          <View style={styles.quickRow} accessibilityLabel="Adicionar água">
            {QUICK.map((ml, i) => {
              const active = lastAmount === ml;
              return (
                <Pressable
                  key={ml}
                  accessibilityRole="button"
                  accessibilityLabel={`Adicionar ${ml} ml`}
                  onPress={() => void add(ml)}
                  disabled={adding !== null}
                  style={({ pressed }) => [
                    styles.quick,
                    active && { borderColor: WATER.accent, backgroundColor: WATER.cardActive },
                    (pressed || adding === ml) && { opacity: 0.7 },
                  ]}
                >
                  <CupIcon size={14 + i * 4} />
                  <Text style={styles.quickText}>{ml}</Text>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Outra quantidade"
              onPress={() => {
                setCustomError(null);
                setCustomOpen(true);
              }}
              disabled={adding !== null}
              style={({ pressed }) => [styles.quick, styles.quickOther, pressed && { opacity: 0.7 }]}
            >
              <Icon name="plus" size={18} color={WATER.light} strokeWidth={2.2} />
              <Text style={[styles.quickText, { fontSize: 12, fontFamily: fonts.bold }]}>Outro</Text>
            </Pressable>
          </View>

          <View style={styles.listHead}>
            <Text style={styles.overline}>{date === today() ? 'REGISTROS DE HOJE' : 'REGISTROS DO DIA'}</Text>
            {missing !== null ? (
              <Text style={styles.missing}>{missing > 0 ? `Faltam ${formatNumber(missing)} ml` : 'Meta atingida'}</Text>
            ) : null}
          </View>

          {entries.length === 0 ? (
            <EmptyState icon="drop" title="Nenhum registro ainda" message="Toque em uma quantidade acima para registrar." />
          ) : (
            <View style={styles.list}>
              {entries.map((e, i) => {
                const time = entryTime(e);
                return (
                  <View key={e.id} style={[styles.entry, i < entries.length - 1 && styles.entryBorder]}>
                    <Text style={styles.entryTime}>{time || '–'}</Text>
                    <Text style={styles.entryAmount}>{formatNumber(e.amountMl)} ml</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Excluir registro${time ? ` das ${time}` : ''}`}
                      onPress={() => confirmRemove(e)}
                      hitSlop={4}
                      style={styles.entryDelete}
                    >
                      <Icon name="trash" size={18} color={colors.textDone} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </>
      ) : null}

      <Sheet visible={customOpen} onClose={() => setCustomOpen(false)} title="Outra quantidade">
        <NumberField
          label="Quantidade (ml)"
          labelColor={colors.textLabel}
          value={custom}
          onChangeText={(t) => {
            setCustom(t.replace(/[^\d]/g, ''));
            setCustomError(null);
          }}
          keyboardType="number-pad"
          placeholder="Ex: 350"
          error={customError}
          autoFocus
          maxLength={4}
          returnKeyType="done"
          onSubmitEditing={addCustom}
        />
        <Button title="Adicionar" onPress={addCustom} loading={adding !== null} />
      </Sheet>
    </Screen>
  );
}

function CupIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 20 25">
      <Path d="M2 2 H18 L16 22 Q15.8 23.5 14 23.5 H6 Q4.2 23.5 4 22 Z" fill="none" stroke={WATER.glass} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M3.2 11 H16.8 L16 22 Q15.8 23.5 14 23.5 H6 Q4.2 23.5 4 22 Z" fill={WATER.light} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: WATER.accent,
    opacity: 0.08,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  title: { fontFamily: fonts.title, fontSize: 16, color: colors.text },
  glassWrap: { alignItems: 'center', paddingTop: 8 },
  count: { position: 'absolute', top: 120, left: 0, right: 0, alignItems: 'center', gap: 2 },
  pct: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.text,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 2 },
  },
  countSub: { fontFamily: fonts.bold, fontSize: 13, color: WATER.text },
  goalCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: WATER.card,
    borderWidth: 1,
    borderColor: WATER.cardBorder,
  },
  goalCtaText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  quickRow: { flexDirection: 'row', gap: 8 },
  quick: {
    flex: 1,
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WATER.cardBorder,
    backgroundColor: WATER.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickOther: { borderStyle: 'dashed', borderColor: WATER.dashed, backgroundColor: 'transparent' },
  quickText: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overline: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1, color: colors.textMuted },
  missing: { fontFamily: fonts.regular, fontSize: 12, color: WATER.muted },
  list: { borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingLeft: 16, paddingRight: 6 },
  entryBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  entryTime: { width: 48, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  entryAmount: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  entryDelete: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
