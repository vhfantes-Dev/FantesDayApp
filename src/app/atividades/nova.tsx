import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { activityApi } from '@/api/endpoints';
import type { Activity, ActivityRequest } from '@/api/types';
import { useAuth, useUserId } from '@/auth/AuthContext';
import { FadeIn } from '@/components/conta/motion';
import { DateField } from '@/components/DateField';
import { Icon } from '@/components/Icon';
import {
  ACTIVITY_KINDS,
  OTHER_KIND,
  activityXp,
  estimateKcal,
  findKnown,
  isImported,
  isKnownKind,
  kindOf,
  normalize,
} from '@/components/rotina/activityTypes';
import { Segmented } from '@/components/rotina/Segmented';
import { useToast } from '@/components/Toast';
import { Button, Card, Chip, ErrorBanner, Field, Header, IconButton, Screen, SkeletonList, T, Tag } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts, radius } from '@/theme';
import { formatDecimal, formatNumber, relativeDate, today } from '@/utils/format';

type Mode = 'text' | 'manual';
type Origin = 'manual' | 'imported';
type Errors = Partial<Record<'other' | 'duration' | 'calories' | 'date' | 'source' | 'text', string>>;

const TEXT_EXAMPLES = ['joguei vôlei por 2 horas', 'corri 5 km em 30 min', 'uma hora e meia de musculação'];

export default function NovaAtividadeScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const editing = editId !== null;
  const userId = useUserId();
  const { user } = useAuth();
  const toast = useToast();
  const todayIso = today();

  const existing = useApi(() => activityApi.get(editId!), [editId], { enabled: editing });
  const catalog = useApi(() => activityApi.catalog(), []);

  const [mode, setMode] = useState<Mode>(editing ? 'manual' : 'text');
  const [kind, setKind] = useState<string>(ACTIVITY_KINDS[0].label);
  const [other, setOther] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [date, setDate] = useState<string | null>(todayIso);
  const [origin, setOrigin] = useState<Origin>('manual');
  const [source, setSource] = useState('');
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [created, setCreated] = useState<Activity | null>(null);
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
    // Calorias estimadas ficam vazias: a API recalcula ao mudar tipo ou duração.
    setCalories(a.caloriesBurned && !a.caloriesEstimated ? String(a.caloriesBurned) : '');
    setDate(a.date);
    if (isImported(a)) {
      setOrigin('imported');
      setSource(a.importSource ?? a.origin ?? '');
    }
  }, [existing.data]);

  const type = kind === OTHER_KIND.label ? other.trim() : kind;
  const minutes = Number(duration) || 0;
  const xp = activityXp(minutes);
  const known = findKnown(catalog.data, type);
  const weightKg = user?.bodyweightKg ?? 70;
  const preview = known && minutes > 0 && !calories ? estimateKcal(known.met, weightKg, minutes) : null;

  function clear(key: keyof Errors) {
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function done() {
    if (router.canGoBack()) router.back();
    else router.replace('/atividades');
  }

  async function submitText() {
    const value = text.trim();
    if (value.length < 3) {
      setErrors({ text: 'Descreva a atividade e a duração, ex: "corri 30 minutos".' });
      return;
    }
    setErrors({});
    setSaveError(null);
    setSaving(true);
    try {
      const a = await activityApi.fromText(userId, value, date ?? undefined);
      setCreated(a);
      toast.success(a.xpEarned ? `${a.activityType} · +${a.xpEarned} XP` : 'Atividade registrada');
    } catch (e) {
      setErrors({ text: e instanceof Error ? e.message : 'Não foi possível entender o texto.' });
    } finally {
      setSaving(false);
    }
  }

  async function submitManual() {
    const next: Errors = {};
    if (!type) next.other = 'Diga qual foi a atividade.';
    const dur = duration ? Number(duration) : undefined;
    if (dur === undefined || !Number.isInteger(dur) || dur <= 0 || dur > 1440) next.duration = 'De 1 a 1440 minutos.';
    const kcal = calories ? Number(calories) : undefined;
    if (kcal !== undefined && (!Number.isInteger(kcal) || kcal < 0 || kcal > 20000)) next.calories = 'Valor inválido.';
    if (!date) next.date = 'Escolha a data.';
    else if (date > todayIso) next.date = 'A data não pode ser no futuro.';
    if (origin === 'imported' && !source.trim()) next.source = 'Informe a fonte (ex: Apple Watch).';
    setErrors(next);
    setSaveError(null);
    if (Object.keys(next).length) return;

    const body: ActivityRequest = {
      activityType: type,
      durationMinutes: dur,
      caloriesBurned: kcal,
      date: date!,
      origin: origin === 'manual' ? 'Manual' : source.trim(),
    };
    setSaving(true);
    try {
      if (editId !== null) {
        await activityApi.update(editId, body);
        toast.success('Atividade atualizada');
      } else {
        const a = await activityApi.create(userId, body);
        toast.success(a.xpEarned ? `${a.activityType} · +${a.xpEarned} XP` : 'Atividade registrada');
      }
      done();
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

  const ready = !editing || !!existing.data;
  const kinds = [...ACTIVITY_KINDS, OTHER_KIND];
  const q = normalize(other);
  const commonNames = new Set(ACTIVITY_KINDS.map((k) => normalize(k.label)));
  const suggestions = (catalog.data ?? [])
    .filter((k) => !commonNames.has(normalize(k.name)))
    .filter((k) => !q || normalize(k.name).includes(q))
    .slice(0, q ? 12 : 40);

  let footer;
  if (!ready) footer = undefined;
  else if (created) footer = <Button title="Ver atividades" onPress={done} />;
  else if (mode === 'text')
    footer = <Button title={saving ? 'Interpretando…' : 'Registrar atividade'} icon="sparkles" onPress={submitText} loading={saving} />;
  else footer = <Button title="Salvar atividade" onPress={submitManual} loading={saving} disabled={deleting} />;

  return (
    <Screen footer={footer}>
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

      {created ? <CreatedCard activity={created} /> : null}

      {ready && !created ? (
        <>
          {!editing ? (
            <Segmented
              value={mode}
              onChange={(m) => {
                setMode(m);
                setErrors({});
                setSaveError(null);
              }}
              options={[
                { value: 'text', label: 'Descrever em texto' },
                { value: 'manual', label: 'Preencher' },
              ]}
            />
          ) : null}

          {mode === 'text' ? (
            <>
              <View style={{ gap: 8 }}>
                <T variant="label">O que você fez?</T>
                <View style={[styles.textBox, errors.text ? { borderColor: colors.danger } : null]}>
                  <TextInput
                    value={text}
                    onChangeText={(t) => {
                      setText(t);
                      clear('text');
                    }}
                    placeholder={'Ex: "joguei vôlei por 2 horas"\nou "corri 5 km em 30 min"'}
                    placeholderTextColor={colors.textDone}
                    selectionColor={colors.accent}
                    multiline
                    maxLength={300}
                    autoFocus
                    editable={!saving}
                    accessibilityLabel="Descreva a atividade"
                    style={styles.textInput}
                  />
                  {saving ? (
                    <View style={styles.interpreting}>
                      <ActivityIndicator size="small" color={colors.accent} />
                      <T variant="caption" color={colors.textLabel}>Interpretando… pode levar alguns segundos</T>
                    </View>
                  ) : null}
                </View>
                {errors.text ? (
                  <View style={styles.errorRow}>
                    <Icon name="alert" size={14} color={colors.danger} strokeWidth={2} />
                    <T variant="caption" color={colors.danger} style={{ flex: 1, fontFamily: fonts.semibold }}>{errors.text}</T>
                  </View>
                ) : (
                  <T variant="caption">Diga a atividade e quanto tempo durou. As calorias são estimadas pelo seu peso.</T>
                )}
              </View>
              <View style={styles.chips}>
                {TEXT_EXAMPLES.map((ex) => (
                  <Chip key={ex} label={ex} onPress={() => setText(ex)} />
                ))}
              </View>
              <DateField label="Data" value={date} onChange={setDate} maximumDate={todayIso} />
            </>
          ) : (
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
                <View style={{ gap: 10 }}>
                  <Field
                    label="Qual atividade?"
                    value={other}
                    onChangeText={(t) => {
                      setOther(t);
                      clear('other');
                    }}
                    placeholder="Buscar ou digitar (ex: Vôlei, Yoga)"
                    maxLength={60}
                    error={errors.other}
                    hint={other.trim() && !known ? 'Fora do catálogo: sem estimativa de calorias.' : undefined}
                  />
                  {catalog.loading && !catalog.data ? <ActivityIndicator color={colors.accent} /> : null}
                  {suggestions.length ? (
                    <View style={styles.chips}>
                      {suggestions.map((k) => (
                        <Chip
                          key={k.code}
                          label={k.name}
                          tone="accent"
                          active={normalize(k.name) === q}
                          onPress={() => {
                            setOther(k.name);
                            clear('other');
                          }}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
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
                  placeholder={preview !== null ? `≈ ${formatNumber(preview)}` : 'Opcional'}
                  keyboardType="number-pad"
                  maxLength={5}
                  error={errors.calories}
                />
              </View>
              {!calories ? (
                <View style={styles.estimate}>
                  <Icon name="flame" size={18} color={colors.carbs} />
                  <T variant="caption" color={colors.textSoft} style={{ flex: 1, lineHeight: 18 }}>
                    {preview !== null && known
                      ? `≈ ${formatNumber(preview)} kcal (MET ${formatDecimal(known.met)} × ${formatDecimal(weightKg)} kg × ${formatDecimal(minutes / 60, 2)} h)`
                      : known
                        ? `Deixe vazio para estimar pelo MET (${formatDecimal(known.met)}). Informe a duração.`
                        : 'Deixe vazio para estimar pelo MET.'}
                    {!user?.bodyweightKg && preview !== null ? ' Sem peso no perfil, usamos 70 kg.' : ''}
                  </T>
                </View>
              ) : null}

              <DateField
                label="Data"
                value={date}
                onChange={(d) => {
                  setDate(d);
                  clear('date');
                }}
                maximumDate={todayIso}
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

              <XpCard xp={xp} minutes={minutes} />
            </>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function XpCard({ xp, minutes }: { xp: number; minutes: number }) {
  return (
    <View style={styles.xpCard}>
      <View style={styles.xpIcon}>
        <Icon name="bolt" size={20} color={colors.onAccent} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.xpValue}>+{xp} XP</Text>
        <T variant="caption" color={colors.textLabel}>
          {minutes > 0 ? (xp >= 60 ? 'Máximo de XP por atividade' : '1 XP a cada 2 minutos (máx. 60)') : 'Informe a duração para ver o XP'}
        </T>
      </View>
    </View>
  );
}

// Resultado do "Descrever em texto".
function CreatedCard({ activity }: { activity: Activity }) {
  const kind = kindOf(activity.activityType);
  return (
    <FadeIn style={{ gap: 12 }}>
      <Card style={{ gap: 14, borderRadius: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.createdIcon, { backgroundColor: kind.bg }]}>
            <Icon name={kind.icon} size={24} color={kind.color} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T style={{ fontFamily: fonts.extrabold, fontSize: 16 }}>{activity.activityType}</T>
            <T variant="caption">{relativeDate(activity.date)} · registrada</T>
          </View>
          <Icon name="check" size={22} color={colors.accent} strokeWidth={2.4} />
        </View>
        <View style={styles.row}>
          <Metric value={activity.durationMinutes ? String(activity.durationMinutes) : '–'} unit="min" label="duração" />
          <Metric
            value={activity.caloriesBurned ? `${activity.caloriesEstimated ? '≈ ' : ''}${formatNumber(activity.caloriesBurned)}` : '–'}
            unit="kcal"
            label={activity.caloriesEstimated ? `estimado${activity.met ? ` · MET ${formatDecimal(activity.met)}` : ''}` : 'calorias'}
          />
          <Metric value={`+${activity.xpEarned ?? 0}`} unit="XP" label="ganhos" accent />
        </View>
        {activity.caloriesEstimated ? <Tag label="Calorias estimadas pelo MET" tone="warn" /> : null}
      </Card>
    </FadeIn>
  );
}

function Metric({ value, unit, label, accent }: { value: string; unit: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, accent && { color: colors.accent }]} numberOfLines={1}>
        {value}
        <Text style={styles.metricUnit}> {unit}</Text>
      </Text>
      <T variant="caption" style={{ fontSize: 11 }} numberOfLines={1}>{label}</T>
    </View>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  textBox: {
    minHeight: 120,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 72,
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 24,
    textAlignVertical: 'top',
    padding: 0,
  },
  interpreting: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  estimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.carbsSoft,
  },
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
  createdIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  metric: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: colors.surface2, gap: 2 },
  metricValue: { fontFamily: fonts.title, fontSize: 17, color: colors.text },
  metricUnit: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted },
});
