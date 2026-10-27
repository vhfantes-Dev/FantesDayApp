import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { activityApi } from '@/api/endpoints';
import type { ActivityRequest } from '@/api/types';
import { useUserId } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { ACTIVITY_KINDS, OTHER_KIND, activityXp, isImported, isKnownKind, kindOf } from '@/components/rotina/activityTypes';
import { brToIso, isoToBr, maskDate } from '@/components/rotina/dates';
import { Segmented } from '@/components/rotina/Segmented';
import { useToast } from '@/components/Toast';
import { Button, ErrorBanner, Field, Header, IconButton, Screen, SkeletonList, T } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';
import { today } from '@/utils/format';

type Origin = 'manual' | 'imported';
type Errors = Partial<Record<'other' | 'duration' | 'calories' | 'date' | 'source', string>>;

export default function NovaAtividadeScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const userId = useUserId();
  const toast = useToast();

  const existing = useApi(() => activityApi.get(editId!), [editId], { enabled: editId !== null });

  const [kind, setKind] = useState<string>(ACTIVITY_KINDS[0].label);
  const [other, setOther] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [date, setDate] = useState(isoToBr(today()));
  const [origin, setOrigin] = useState<Origin>('manual');
  const [source, setSource] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const a = existing.data;
    if (!a || initialized.current) return;
    initialized.current = true;
    if (isKnownKind(a.activityType)) setKind(kindOf(a.activityType).label);
    else {
      setKind(OTHER_KIND.label);
      setOther(a.activityType);
    }
    setDuration(a.durationMinutes ? String(a.durationMinutes) : '');
    setCalories(a.caloriesBurned ? String(a.caloriesBurned) : '');
    setDate(isoToBr(a.date));
    if (isImported(a)) {
      setOrigin('imported');
      setSource(a.importSource ?? a.origin ?? '');
    }
  }, [existing.data]);

  const minutes = Number(duration) || 0;
  const xp = activityXp(minutes);

  function clear(key: keyof Errors) {
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit() {
    const next: Errors = {};
    const type = kind === OTHER_KIND.label ? other.trim() : kind;
    if (!type) next.other = 'Diga qual foi a atividade.';
    const dur = duration ? Number(duration) : undefined;
    if (dur === undefined || !Number.isInteger(dur) || dur <= 0 || dur > 1440) next.duration = 'De 1 a 1440 minutos.';
    const kcal = calories ? Number(calories) : undefined;
    if (kcal !== undefined && (!Number.isInteger(kcal) || kcal < 0 || kcal > 20000)) next.calories = 'Valor inválido.';
    const iso = brToIso(date);
    if (!iso) next.date = 'Data inválida. Use dd/mm/aaaa.';
    else if (iso > today()) next.date = 'A data não pode ser no futuro.';
    if (origin === 'imported' && !source.trim()) next.source = 'Informe a fonte (ex: Apple Watch).';
    setErrors(next);
    setSaveError(null);
    if (Object.keys(next).length) return;

    const body: ActivityRequest = {
      activityType: type,
      durationMinutes: dur,
      caloriesBurned: kcal,
      date: iso!,
      origin: origin === 'manual' ? 'Manual' : source.trim(),
    };
    setSaving(true);
    try {
      if (editId !== null) {
        await activityApi.update(editId, body);
        toast.success('Atividade atualizada');
      } else {
        const created = await activityApi.create(userId, body);
        toast.success(created.xpEarned ? `${created.activityType} · +${created.xpEarned} XP` : 'Atividade registrada');
      }
      if (router.canGoBack()) router.back();
      else router.replace('/atividades');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (editId === null) return;
    Alert.alert('Excluir atividade?', 'O XP que ela rendeu é descontado do seu progresso.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await activityApi.remove(editId);
            toast.success('Atividade excluída');
            router.back();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Não foi possível excluir.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  const editing = editId !== null;
  const ready = !editing || !!existing.data;
  const kinds = [...ACTIVITY_KINDS, OTHER_KIND];

  return (
    <Screen footer={ready ? <Button title="Salvar atividade" onPress={submit} loading={saving} disabled={deleting} /> : undefined}>
      <Header
        title={editing ? 'Editar atividade' : 'Nova atividade'}
        right={
          editing ? (
            <IconButton
              icon="trash"
              label="Excluir atividade"
              color={colors.danger}
              onPress={deleting ? undefined : confirmDelete}
              style={{ borderColor: colors.dangerBorder, backgroundColor: '#1A1214' }}
            />
          ) : undefined
        }
      />

      {editing && existing.error && !existing.data ? (
        <ErrorBanner message={existing.error.message} onRetry={existing.reload} />
      ) : null}
      {editing && existing.loading && !existing.data ? <SkeletonList rows={3} /> : null}
      {saveError ? <ErrorBanner title="Não foi possível salvar" message={saveError} /> : null}

      {ready ? (
        <>
          <View style={{ gap: 10 }}>
            <T variant="label">Tipo de atividade</T>
            <View style={styles.kinds}>
              {kinds.map((k) => {
                const active = kind === k.label;
                return (
                  <Pressable
                    key={k.label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      setKind(k.label);
                      clear('other');
                    }}
                    style={[styles.kind, active && styles.kindActive]}
                  >
                    <Icon name={k.icon} size={24} color={active ? colors.accent : colors.textSoft} />
                    <Text style={[styles.kindText, active && { color: colors.accent, fontFamily: fonts.extrabold }]}>
                      {k.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {kind === OTHER_KIND.label ? (
            <Field
              label="Qual atividade?"
              value={other}
              onChangeText={(t) => {
                setOther(t);
                clear('other');
              }}
              placeholder="Ex: Yoga, Futebol, Dança"
              maxLength={60}
              error={errors.other}
            />
          ) : null}

          <View style={styles.row}>
            <Field
              style={{ flex: 1 }}
              label="Duração (min)"
              value={duration}
              onChangeText={(t) => {
                setDuration(t.replace(/\D/g, ''));
                clear('duration');
              }}
              placeholder="30"
              keyboardType="number-pad"
              maxLength={4}
              error={errors.duration}
            />
            <Field
              style={{ flex: 1 }}
              label="Calorias (kcal)"
              value={calories}
              onChangeText={(t) => {
                setCalories(t.replace(/\D/g, ''));
                clear('calories');
              }}
              placeholder="Opcional"
              keyboardType="number-pad"
              maxLength={5}
              error={errors.calories}
            />
          </View>

          <Field
            label="Data"
            value={date}
            onChangeText={(t) => {
              setDate(maskDate(t));
              clear('date');
            }}
            placeholder="dd/mm/aaaa"
            keyboardType="number-pad"
            maxLength={10}
            error={errors.date}
          />

          <View style={{ gap: 8 }}>
            <Segmented
              label="Origem"
              value={origin}
              onChange={(o) => {
                setOrigin(o);
                clear('source');
              }}
              options={[
                { value: 'manual', label: 'Manual' },
                { value: 'imported', label: 'Importada' },
              ]}
            />
            {origin === 'imported' ? (
              <Field
                value={source}
                onChangeText={(t) => {
                  setSource(t);
                  clear('source');
                }}
                placeholder="Fonte (ex: Apple Watch, Strava)"
                accessibilityLabel="Fonte"
                maxLength={40}
                error={errors.source}
              />
            ) : null}
            <T variant="caption">Em "Importada", informe a fonte (ex.: relógio ou app de saúde).</T>
          </View>

          <View style={styles.xpCard}>
            <View style={styles.xpIcon}>
              <Icon name="bolt" size={20} color={colors.onAccent} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.xpValue}>+{xp} XP</Text>
              <T variant="caption" color={colors.textLabel}>
                {minutes > 0
                  ? xp >= 60
                    ? 'Máximo de XP por atividade'
                    : '1 XP a cada 2 minutos (máx. 60)'
                  : 'Informe a duração para ver o XP'}
              </T>
            </View>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kind: {
    width: '31%',
    flexGrow: 1,
    height: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  kindActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  kindText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSoft },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentSoftBorder,
  },
  xpIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  xpValue: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
});
