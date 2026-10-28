import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { goalApi, userApi } from '@/api/endpoints';
import { appendFile } from '@/api/upload';
import type { ActivityLevel, NutritionGoalRequest, Sex, UserRequest } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { ACTIVITY_LEVELS, ageFrom } from '@/components/conta/body';
import { UserPhoto, useDeleteAccount } from '@/components/conta/UserPhoto';
import { DateField } from '@/components/DateField';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, Chip, ErrorBanner, Field, Header, Screen, Section, SkeletonList, T } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { addDays, formatDecimal, parseNumber, today } from '@/utils/format';

type GoalKey = 'dailyCalories' | 'proteinG' | 'carbsG' | 'fatG' | 'dailyWaterMl';
type Errors = Partial<Record<'name' | 'email' | 'weight' | 'height' | 'birth' | GoalKey, string>>;

const GOAL_FIELDS: { key: GoalKey; label: string; placeholder: string; max: number }[] = [
  { key: 'dailyCalories', label: 'Calorias (kcal)', placeholder: '2200', max: 10000 },
  { key: 'dailyWaterMl', label: 'Água (ml)', placeholder: '2500', max: 10000 },
  { key: 'proteinG', label: 'Proteína (g)', placeholder: '150', max: 1000 },
  { key: 'carbsG', label: 'Carboidratos (g)', placeholder: '250', max: 2000 },
  { key: 'fatG', label: 'Gordura (g)', placeholder: '70', max: 1000 },
];

const numText = (n: number | null | undefined) => (n === null || n === undefined ? '' : formatDecimal(n));

export default function EditarPerfilScreen() {
  const { user, setUser, refreshUser } = useAuth();
  const userId = user?.id ?? 0;
  const toast = useToast();
  const deleteAccount = useDeleteAccount();

  const goals = useApi(() => goalApi.get(userId), [userId], { enabled: !!user });

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [weight, setWeight] = useState(numText(user?.bodyweightKg));
  const [sex, setSex] = useState<Sex | null>(user?.sex ?? null);
  const [height, setHeight] = useState(user?.heightCm ? String(Math.round(user.heightCm)) : '');
  const [birth, setBirth] = useState<string | null>(user?.birthDate ?? null);
  const [level, setLevel] = useState<ActivityLevel | null>(user?.activityLevel ?? null);
  const [goalForm, setGoalForm] = useState<Record<GoalKey, string>>({
    dailyCalories: '',
    proteinG: '',
    carbsG: '',
    fatG: '',
    dailyWaterMl: '',
  });
  const goalsInitialized = useRef(false);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);

  useEffect(() => {
    const g = goals.data;
    if (g && !goalsInitialized.current) {
      goalsInitialized.current = true;
      setGoalForm({
        dailyCalories: numText(g.dailyCalories),
        proteinG: numText(g.proteinG),
        carbsG: numText(g.carbsG),
        fatG: numText(g.fatG),
        dailyWaterMl: numText(g.dailyWaterMl),
      });
    }
  }, [goals.data]);

  if (!user) return null;
  const currentUser = user;

  async function save() {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Informe seu nome.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Informe um e-mail válido.';
    const kg = parseNumber(weight);
    if (weight.trim() && (kg === undefined || kg < 20 || kg > 400)) next.weight = 'Peso inválido (20 a 400 kg).';
    const cm = height.trim() ? Number(height) : undefined;
    if (cm !== undefined && (!Number.isFinite(cm) || cm < 100 || cm > 250)) next.height = 'Altura inválida (100 a 250 cm).';
    let birthIso: string | undefined;
    if (birth) {
      if (ageFrom(birth, today()) < 10 || ageFrom(birth, today()) > 110) next.birth = 'Confira o ano de nascimento.';
      else birthIso = birth;
    }

    const goalRequest: NutritionGoalRequest = {};
    for (const f of GOAL_FIELDS) {
      const text = goalForm[f.key];
      if (!text.trim()) continue;
      const n = parseNumber(text);
      if (n === undefined || n < 0 || n > f.max) next[f.key] = `Valor inválido (0 a ${f.max}).`;
      else goalRequest[f.key] = n;
    }
    setErrors(next);
    setSaveError(null);
    if (Object.keys(next).length) return;

    // Envia só o que mudou. Mudar o peso pelo perfil já registra o peso de hoje no histórico.
    const profile: UserRequest = {};
    if (name.trim() !== currentUser.name) profile.name = name.trim();
    if (email.trim() !== currentUser.email) profile.email = email.trim();
    if (kg !== undefined && kg !== currentUser.bodyweightKg) profile.bodyweightKg = kg;
    if (sex && sex !== currentUser.sex) profile.sex = sex;
    if (cm !== undefined && cm !== currentUser.heightCm) profile.heightCm = cm;
    if (birthIso && birthIso !== currentUser.birthDate) profile.birthDate = birthIso;
    if (level && level !== currentUser.activityLevel) profile.activityLevel = level;

    const g = goals.data;
    const goalsChanged =
      !!g && GOAL_FIELDS.some((f) => goalRequest[f.key] !== undefined && goalRequest[f.key] !== g[f.key]);

    setSaving(true);
    try {
      if (Object.keys(profile).length) setUser(await userApi.update(currentUser.id, profile));
      if (goalsChanged || (!g && Object.keys(goalRequest).length)) {
        goals.setData(await goalApi.update(currentUser.id, goalRequest));
      }
      toast.success('Perfil atualizado');
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.';
      if (/e-?mail/i.test(message)) setErrors({ email: message.replace('ja ', 'já ') });
      else setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    const type = asset.mimeType ?? 'image/jpeg';
    const ext = type.split('/')[1] ?? 'jpg';
    setPhotoBusy(true);
    try {
      const form = new FormData();
      await appendFile(form, 'file', { uri: asset.uri, name: asset.fileName ?? `foto.${ext}`, type });
      setUser(await userApi.uploadPhoto(currentUser.id, form));
      setPhotoVersion((v) => v + 1);
      toast.success('Foto atualizada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível enviar a foto.');
    } finally {
      setPhotoBusy(false);
    }
  }

  function removePhoto() {
    Alert.alert('Remover foto?', 'Seu perfil volta a mostrar as iniciais.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setPhotoBusy(true);
          try {
            await userApi.removePhoto(currentUser.id);
            await refreshUser();
            setPhotoVersion((v) => v + 1);
            toast.success('Foto removida');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Não foi possível remover a foto.');
          } finally {
            setPhotoBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <Screen footer={<Button title="Salvar" onPress={save} loading={saving} />}>
      <Header title="Editar perfil" />

      <View style={styles.photoWrap}>
        <View style={{ width: 72, height: 72 }}>
          <UserPhoto user={currentUser} size={72} borderRadius={24} version={photoVersion} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trocar foto"
            onPress={photoBusy ? undefined : pickPhoto}
            hitSlop={6}
            style={styles.cameraButton}
          >
            {photoBusy ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : (
              <Icon name="camera" size={18} color={colors.onAccent} strokeWidth={2.2} />
            )}
          </Pressable>
        </View>
        {currentUser.photoUrl ? (
          <Pressable accessibilityRole="button" onPress={photoBusy ? undefined : removePhoto} hitSlop={8} style={styles.removePhoto}>
            <Text style={styles.removePhotoText}>Remover foto</Text>
          </Pressable>
        ) : (
          <T variant="caption">JPG, PNG ou WebP até 2 MB</T>
        )}
      </View>

      {saveError ? <ErrorBanner title="Não foi possível salvar" message={saveError} /> : null}

      <Field
        label="Nome"
        value={name}
        onChangeText={(t) => {
          setName(t);
          setErrors((e) => ({ ...e, name: undefined }));
        }}
        autoComplete="name"
        error={errors.name}
      />
      <Field
        label="E-mail"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setErrors((e) => ({ ...e, email: undefined }));
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        error={errors.email}
      />
      <View style={styles.row}>
        <Field
          style={{ flex: 1 }}
          label="Peso (kg) · p/ rank"
          value={weight}
          onChangeText={(t) => {
            setWeight(t.replace(/[^\d.,]/g, ''));
            setErrors((e) => ({ ...e, weight: undefined }));
          }}
          placeholder="78,5"
          keyboardType="decimal-pad"
          maxLength={6}
          error={errors.weight}
        />
        <Field
          style={{ flex: 1 }}
          label="Altura (cm)"
          value={height}
          onChangeText={(t) => {
            setHeight(t.replace(/\D/g, ''));
            setErrors((e) => ({ ...e, height: undefined }));
          }}
          placeholder="178"
          keyboardType="number-pad"
          maxLength={3}
          error={errors.height}
        />
      </View>
      <View style={styles.row}>
        <DateField
          style={{ flex: 1 }}
          label="Nascimento"
          value={birth}
          onChange={(iso) => {
            setBirth(iso);
            setErrors((e) => ({ ...e, birth: undefined }));
          }}
          maximumDate={today()}
          initialDate={addDays(today(), -365 * 25)}
          error={errors.birth}
        />
        <View style={{ flex: 1, gap: 8 }}>
          <T variant="label">Sexo</T>
          <View style={styles.sexSegment}>
            {(['MALE', 'FEMALE'] as const).map((v) => (
              <Pressable
                key={v}
                accessibilityRole="radio"
                accessibilityState={{ selected: sex === v }}
                onPress={() => setSex(v)}
                style={[styles.sexItem, sex === v && { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.sexText, sex === v && { color: colors.onAccent, fontFamily: fonts.extrabold }]}>
                  {v === 'MALE' ? 'Masc.' : 'Fem.'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <T variant="caption" style={{ marginTop: -8 }}>Ao mudar o peso, o valor de hoje entra no seu histórico.</T>

      <View style={{ gap: 8 }}>
        <T variant="label">Nível de atividade</T>
        <View style={styles.levels}>
          {ACTIVITY_LEVELS.map((l) => (
            <Chip key={l.value} label={l.label} tone="accent" active={level === l.value} onPress={() => setLevel(l.value)} />
          ))}
        </View>
        {level ? <T variant="caption">{ACTIVITY_LEVELS.find((l) => l.value === level)?.description}</T> : null}
      </View>

      <Section title="Metas de nutrição" action="Calcular metas" onAction={() => router.push('/metabolismo')}>
        {goals.error && !goals.data ? <ErrorBanner message={goals.error.message} onRetry={goals.reload} /> : null}
        {goals.loading && !goals.data ? <SkeletonList rows={1} /> : null}
        {goals.data ? (
          <View style={styles.grid}>
            {GOAL_FIELDS.map((f) => (
              <Field
                key={f.key}
                style={styles.gridItem}
                label={f.label}
                value={goalForm[f.key]}
                onChangeText={(t) => {
                  setGoalForm((g) => ({ ...g, [f.key]: t.replace(/[^\d.,]/g, '') }));
                  setErrors((e) => ({ ...e, [f.key]: undefined }));
                }}
                placeholder={f.placeholder}
                keyboardType="decimal-pad"
                maxLength={6}
                error={errors[f.key]}
              />
            ))}
          </View>
        ) : null}
      </Section>

      <View style={styles.danger}>
        <Text style={styles.dangerTitle}>Excluir conta</Text>
        <T variant="caption" color="#C4A8A6" style={{ lineHeight: 18 }}>
          Apaga seu usuário, progresso, tarefas, refeições, treinos e atividades. Não dá para desfazer.
        </T>
        <Pressable
          accessibilityRole="button"
          onPress={deleteAccount.deleting ? undefined : deleteAccount.confirm}
          style={({ pressed }) => [styles.dangerButton, (pressed || deleteAccount.deleting) && { opacity: 0.7 }]}
        >
          <Text style={styles.dangerButtonText}>{deleteAccount.deleting ? 'Excluindo…' : 'Excluir minha conta'}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoWrap: { alignItems: 'center', gap: 14 },
  cameraButton: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.bg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhoto: { paddingVertical: 6, minHeight: 32, justifyContent: 'center' },
  removePhotoText: { fontFamily: fonts.bold, fontSize: 13, color: colors.danger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sexSegment: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderInput,
  },
  sexItem: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sexText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSoft },
  gridItem: { width: '48%', flexGrow: 1 },
  danger: {
    gap: 10,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#1A1214',
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    marginTop: 8,
  },
  dangerTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.danger },
  dangerButton: {
    alignSelf: 'flex-start',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#5A2A2E',
    justifyContent: 'center',
  },
  dangerButtonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.danger },
});
