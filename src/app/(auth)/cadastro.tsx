import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Sex } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { Button, Chip, ErrorBanner, Field, IconButton, Screen, T, Toggle } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { parseNumber } from '@/utils/format';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'weight', string>>;

export default function CadastroScreen() {
  const { signUp, biometricAvailable } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [weight, setWeight] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [faceId, setFaceId] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function clear(key: keyof Errors) {
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit() {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Informe seu nome.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Informe um e-mail válido.';
    if (password.length < 8 || password.length > 72) next.password = 'A senha precisa ter de 8 a 72 caracteres.';
    const kg = parseNumber(weight);
    if (weight.trim() && (kg === undefined || kg < 20 || kg > 400)) next.weight = 'Peso inválido (20 a 400 kg).';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setPending(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        bodyweightKg: kg,
        sex: sex ?? undefined,
        enableBiometric: biometricAvailable && faceId,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.';
      if (/e-?mail/i.test(message)) setErrors((er) => ({ ...er, email: message.replace('ja ', 'já ') }));
      else if (/senha/i.test(message)) setErrors((er) => ({ ...er, password: message }));
      else setFormError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ paddingHorizontal: 24, gap: 28 }}>
        <IconButton
          icon="back"
          label="Voltar"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
        />

        <View style={{ gap: 10 }}>
          <T variant="display" style={{ fontSize: 28 }}>Criar conta</T>
          <T style={styles.lead}>Você começa no nível 1. Cada hábito, refeição e treino rende XP.</T>
        </View>

        <View style={{ gap: 16 }}>
          {formError ? <ErrorBanner title="Não foi possível criar a conta" message={formError} /> : null}
          <Field
            label="Nome"
            value={name}
            onChangeText={(t) => {
              setName(t);
              clear('name');
            }}
            placeholder="Seu nome"
            autoComplete="name"
            textContentType="name"
            error={errors.name}
          />
          <Field
            label="E-mail"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              clear('email');
            }}
            placeholder="voce@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            error={errors.email}
          />
          <Field
            label="Senha"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              clear('password');
            }}
            placeholder="Crie uma senha"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={72}
            hint="Mínimo de 8 caracteres"
            error={errors.password}
          />

          <View style={styles.optional}>
            <View style={{ gap: 4 }}>
              <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>Para o rank de força (opcional)</T>
              <T variant="caption" style={{ lineHeight: 18 }}>
                O rank compara suas cargas com o seu peso corporal e sexo. Dá para preencher depois no perfil.
              </T>
            </View>
            <Field
              label="Peso (kg)"
              value={weight}
              onChangeText={(t) => {
                setWeight(t.replace(/[^\d.,]/g, ''));
                clear('weight');
              }}
              placeholder="Ex: 78,5"
              keyboardType="decimal-pad"
              maxLength={6}
              error={errors.weight}
            />
            <View style={{ gap: 8 }}>
              <T variant="label">Sexo</T>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip label="Masculino" tone="accent" active={sex === 'MALE'} onPress={() => setSex(sex === 'MALE' ? null : 'MALE')} />
                <Chip label="Feminino" tone="accent" active={sex === 'FEMALE'} onPress={() => setSex(sex === 'FEMALE' ? null : 'FEMALE')} />
              </View>
            </View>
          </View>

          {biometricAvailable ? (
            <View style={styles.faceId}>
              <Icon name="faceId" size={24} color={colors.accent} />
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>Ativar Face ID</T>
                <T variant="caption">Entre sem digitar a senha</T>
              </View>
              <Toggle value={faceId} onChange={setFaceId} label="Ativar Face ID" />
            </View>
          ) : null}
        </View>

        <View style={{ gap: 16 }}>
          <Button title="Criar conta" onPress={submit} loading={pending} />
          <View style={styles.bottom}>
            <T style={styles.bottomText}>Já tem conta? </T>
            <Pressable
              accessibilityRole="link"
              hitSlop={10}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
            >
              <Text style={styles.link}>Entrar</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  optional: {
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faceId: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bottom: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bottomText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },
});
