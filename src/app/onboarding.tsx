import { router } from 'expo-router';
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { userApi } from '@/api/endpoints';
import type { ActivityLevel, Sex, UserRequest } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { ACTIVITY_LEVELS, ageFrom, factorLabel } from '@/components/conta/body';
import { HeightRuler } from '@/components/conta/HeightRuler';
import { FadeIn, useOnce } from '@/components/conta/motion';
import { DateField } from '@/components/DateField';
import { Segmented } from '@/components/rotina/Segmented';
import { Button, ErrorBanner, Field, Screen, T } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { addDays, formatDecimal, parseNumber, today } from '@/utils/format';

type Errors = Partial<Record<'sex' | 'birth' | 'weight' | 'level', string>>;

export default function OnboardingScreen() {
  const { user, setUser } = useAuth();
  const [sex, setSex] = useState<Sex | null>(user?.sex ?? null);
  const [birth, setBirth] = useState<string | null>(user?.birthDate ?? null);
  const [weight, setWeight] = useState(user?.bodyweightKg ? formatDecimal(user.bodyweightKg) : '');
  const [height, setHeight] = useState(user?.heightCm ? Math.round(user.heightCm) : 170);
  const [level, setLevel] = useState<ActivityLevel | null>(user?.activityLevel ?? null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const step = useOnce(1000);

  function skip() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function submit() {
    if (!user) return;
    const next: Errors = {};
    if (!sex) next.sex = 'Escolha uma opção.';
    const birthIso = birth;
    if (!birthIso) next.birth = 'Escolha sua data de nascimento.';
    else {
      const age = ageFrom(birthIso, today());
      if (age < 10 || age > 110) next.birth = 'Confira o ano.';
    }
    const kg = parseNumber(weight);
    if (kg === undefined || kg < 20 || kg > 400) next.weight = 'De 20 a 400 kg.';
    if (!level) next.level = 'Escolha o nível que mais combina com sua rotina.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    const body: UserRequest = {
      sex: sex!,
      birthDate: birthIso!,
      heightCm: height,
      activityLevel: level!,
    };
    // Só manda o peso se mudou: cada envio grava o peso de hoje no histórico.
    if (kg !== user.bodyweightKg) body.bodyweightKg = kg;

    setPending(true);
    try {
      setUser(await userApi.update(user.id, body));
      router.replace({ pathname: '/metabolismo', params: { from: 'onboarding' } });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen
      contentStyle={{ gap: 14 }}
      footer={<Button title="Calcular meu metabolismo" onPress={submit} loading={pending} />}
    >
      <View style={styles.top}>
        <View style={styles.steps} accessibilityLabel="Passo 2 de 3">
          <View style={[styles.step, { backgroundColor: colors.accent }]} />
          <View style={[styles.step, { overflow: 'hidden' }]}>
            <Animated.View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.accent, transformOrigin: 'left', transform: [{ scaleX: step }] }]}
            />
          </View>
          <View style={styles.step} />
        </View>
        <Pressable accessibilityRole="button" onPress={skip} hitSlop={10} style={styles.skip}>
          <Text style={styles.skipText}>Pular</Text>
        </Pressable>
      </View>

      <View style={{ gap: 6 }}>
        <T variant="display" style={{ fontSize: 24 }}>Conte sobre você</T>
        <T style={styles.lead}>Para calcular gasto diário, metas e rank de força.</T>
      </View>

      {formError ? <ErrorBanner title="Não foi possível salvar" message={formError} /> : null}

      <FadeIn style={{ gap: 6 }}>
        <Segmented
          label="Sexo"
          value={sex ?? ('' as Sex)}
          onChange={(v) => {
            setSex(v);
            setErrors((e) => ({ ...e, sex: undefined }));
          }}
          options={[
            { value: 'MALE', label: 'Masculino' },
            { value: 'FEMALE', label: 'Feminino' },
          ]}
        />
        {errors.sex ? <T variant="caption" color={colors.danger}>{errors.sex}</T> : null}
      </FadeIn>

      <FadeIn delay={60} style={styles.row}>
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
        <Field
          style={{ flex: 1 }}
          label="Peso (kg)"
          value={weight}
          onChangeText={(t) => {
            setWeight(t.replace(/[^\d.,]/g, ''));
            setErrors((e) => ({ ...e, weight: undefined }));
          }}
          placeholder="78,0"
          keyboardType="decimal-pad"
          maxLength={6}
          error={errors.weight}
        />
      </FadeIn>

      <FadeIn delay={120}>
        <HeightRuler value={height} onChange={setHeight} />
      </FadeIn>

      <FadeIn delay={180} style={{ gap: 8 }}>
        <T variant="label">Nível de atividade no dia a dia</T>
        <View style={{ gap: 4 }} accessibilityRole="radiogroup">
          {ACTIVITY_LEVELS.map((l) => {
            const active = level === l.value;
            return (
              <Pressable
                key={l.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setLevel(l.value);
                  setErrors((e) => ({ ...e, level: undefined }));
                }}
                style={[styles.level, active && styles.levelActive]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.levelTitle, active && { fontFamily: fonts.extrabold }]}>{l.label}</Text>
                  <Text style={[styles.levelDesc, active && { color: colors.textLabel }]}>{l.description}</Text>
                </View>
                <Text style={[styles.factor, active && { color: colors.accent, fontFamily: fonts.extrabold }]}>
                  {factorLabel(l.factor)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.level ? <T variant="caption" color={colors.danger}>{errors.level}</T> : null}
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  steps: { flex: 1, flexDirection: 'row', gap: 6 },
  step: { flex: 1, height: 6, borderRadius: 99, backgroundColor: colors.border },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  skipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textMuted },
  lead: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.textMuted },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  levelActive: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSoft },
  levelTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  levelDesc: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  factor: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textDone },
});
