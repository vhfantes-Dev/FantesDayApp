import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Activity, ActivityImportResult } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { SyncAnimation } from '@/components/conta/Illustrations';
import { FadeIn } from '@/components/conta/motion';
import { Icon, type IconName } from '@/components/Icon';
import { kindOf } from '@/components/rotina/activityTypes';
import {
  DEFAULT_SOURCE,
  HEALTH_SOURCES,
  syncHealthActivities,
  type HealthAvailability,
  type HealthSourceId,
} from '@/components/rotina/healthSource';
import { useToast } from '@/components/Toast';
import { Button, Card, Chip, ErrorBanner, Header, Screen, T } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { addDays, formatNumber, relativeDate, today } from '@/utils/format';

const SOURCES: { id: HealthSourceId; icon: IconName; color: string; bg: string }[] = [
  { id: 'APPLE_HEALTH', icon: 'apple', color: colors.fat, bg: colors.fatSoft },
  { id: 'GOOGLE_FIT', icon: 'pulse', color: colors.protein, bg: colors.proteinSoft },
];
const PERIODS = [7, 30, 90];

export default function ImportarAtividadesScreen() {
  const userId = useUserId();
  const toast = useToast();
  const [sourceId, setSourceId] = useState<HealthSourceId>(DEFAULT_SOURCE);
  const [days, setDays] = useState(30);
  const [availability, setAvailability] = useState<HealthAvailability | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActivityImportResult | null>(null);

  useEffect(() => {
    let alive = true;
    setAvailability(null);
    HEALTH_SOURCES[sourceId]
      .isAvailable()
      .then((a) => alive && setAvailability(a))
      .catch(() => alive && setAvailability({ available: false, reason: 'Não foi possível verificar o acesso.' }));
    return () => {
      alive = false;
    };
  }, [sourceId]);

  async function sync() {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const r = await syncHealthActivities(userId, sourceId, addDays(today(), -days));
      setResult(r);
      if (r.imported) toast.success(`${r.imported} atividade${r.imported > 1 ? 's' : ''} importada${r.imported > 1 ? 's' : ''} · +${r.xpEarned} XP`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível sincronizar.');
    } finally {
      setSyncing(false);
    }
  }

  const source = SOURCES.find((s) => s.id === sourceId)!;
  const label = HEALTH_SOURCES[sourceId].label;
  const unavailable = availability !== null && !availability.available;

  return (
    <Screen
      contentStyle={{ gap: 14 }}
      footer={
        result ? (
          <Button title="Ver atividades" onPress={() => (router.canGoBack() ? router.back() : router.replace('/atividades'))} />
        ) : (
          <Button
            title={syncing ? 'Sincronizando…' : `Sincronizar com ${label}`}
            onPress={sync}
            loading={syncing}
            disabled={!availability?.available}
          />
        )
      }
    >
      <Header title="Importar atividades" />

      <View style={{ paddingVertical: 6 }}>
        <SyncAnimation active={syncing} sourceColor={source.color} />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.overline}>ORIGEM</Text>
        <View style={styles.row} accessibilityRole="radiogroup">
          {SOURCES.map((s) => {
            const active = s.id === sourceId;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setSourceId(s.id);
                  setResult(null);
                  setError(null);
                }}
                style={[styles.source, active && { borderWidth: 2, borderColor: s.color, backgroundColor: s.bg }]}
              >
                <Icon name={s.icon} size={20} color={s.color} />
                <Text style={[styles.sourceText, active && { fontFamily: fonts.extrabold }]}>{HEALTH_SOURCES[s.id].label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.overline}>PERÍODO</Text>
        <View style={styles.chips}>
          {PERIODS.map((d) => (
            <Chip key={d} label={`Últimos ${d} dias`} active={days === d} onPress={() => setDays(d)} />
          ))}
        </View>
      </View>

      {availability === null ? (
        <View style={styles.checking}>
          <ActivityIndicator color={colors.accent} />
          <T variant="caption">Verificando acesso ao {label}…</T>
        </View>
      ) : unavailable ? (
        <Card style={styles.unavailable}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="lock" size={20} color={colors.carbs} />
            <T style={{ fontFamily: fonts.bold, flex: 1 }}>Indisponível neste build</T>
          </View>
          <T variant="caption" style={{ lineHeight: 18 }}>{availability.reason}</T>
          <Button title="Registrar manualmente" variant="secondary" small icon="plus" onPress={() => router.push('/atividades/nova')} />
        </Card>
      ) : null}

      {error ? <ErrorBanner title="Não foi possível sincronizar" message={error} onRetry={sync} /> : null}

      {result ? (
        <FadeIn style={{ gap: 14 }}>
          <Card style={{ gap: 12, borderRadius: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="check" size={22} color={colors.accent} strokeWidth={2.4} />
              <T style={{ flex: 1, fontFamily: fonts.extrabold }}>
                {result.imported ? 'Sincronização concluída' : 'Nada novo para importar'}
              </T>
              {result.xpEarned ? (
                <View style={styles.xpPill}>
                  <Text style={styles.xpPillText}>+{formatNumber(result.xpEarned)} XP</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.row}>
              <View style={styles.count}>
                <Text style={styles.countValue}>{result.imported}</Text>
                <T variant="caption" style={{ fontSize: 11 }}>importadas</T>
              </View>
              <View style={styles.count}>
                <Text style={[styles.countValue, { color: colors.textMuted }]}>{result.skipped}</Text>
                <T variant="caption" style={{ fontSize: 11 }}>já existiam, ignoradas</T>
              </View>
            </View>
          </Card>

          {result.activities.length ? (
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {result.activities.map((a, i) => (
                <ImportedRow key={a.id} activity={a} last={i === result.activities.length - 1} />
              ))}
            </Card>
          ) : null}
        </FadeIn>
      ) : null}

      <T variant="caption" style={{ textAlign: 'center', fontSize: 11, color: colors.textDone }}>
        Atividades repetidas são reconhecidas e não contam XP duas vezes.
      </T>
    </Screen>
  );
}

function ImportedRow({ activity, last }: { activity: Activity; last: boolean }) {
  const kind = kindOf(activity.activityType);
  const meta = [
    relativeDate(activity.date),
    activity.durationMinutes ? `${activity.durationMinutes} min` : null,
    activity.caloriesBurned ? `${formatNumber(activity.caloriesBurned)} kcal` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={[styles.item, !last && styles.itemBorder]}>
      <View style={[styles.itemIcon, { backgroundColor: kind.bg }]}>
        <Icon name={kind.icon} size={18} color={kind.color} />
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{activity.activityType}</T>
        <T variant="caption" style={{ fontSize: 11 }}>{meta}</T>
      </View>
      <Text style={styles.itemXp}>+{activity.xpEarned ?? 0} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overline: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1, color: colors.textMuted },
  row: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  source: {
    flex: 1,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sourceText: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  checking: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  unavailable: { gap: 10, borderColor: colors.carbsSoft },
  xpPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: colors.accent },
  xpPillText: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.onAccent },
  count: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: colors.surface2, gap: 2 },
  countValue: { fontFamily: fonts.title, fontSize: 20, color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  itemIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemXp: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.accent },
});
