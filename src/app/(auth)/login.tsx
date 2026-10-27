import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { AppIcon } from '@/components/Logo';
import { Button, ErrorBanner, Field, Screen, T } from '@/components/ui';
import { colors, fonts } from '@/theme';

export default function LoginScreen() {
  const { signIn, signInWithBiometrics, biometricReady } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [bioPending, setBioPending] = useState(false);
  const prompted = useRef(false);

  async function biometric() {
    setFormError(null);
    setBioPending(true);
    try {
      const ok = await signInWithBiometrics();
      if (!ok) setFormError('Não deu para entrar com Face ID. Use seu e-mail e senha.');
    } catch {
      setFormError('Não deu para entrar com Face ID. Use seu e-mail e senha.');
    } finally {
      setBioPending(false);
    }
  }

  // Abre o Face ID uma vez ao chegar na tela, se houver sessão guardada.
  useEffect(() => {
    if (biometricReady && !prompted.current) {
      prompted.current = true;
      void biometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricReady]);

  async function submit() {
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Informe um e-mail válido.';
    if (!password) next.password = 'Informe sua senha.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      await signIn(email, password);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setFormError('E-mail ou senha incorretos');
      else setFormError(e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen glow="topLeft" contentStyle={styles.content}>
        <View style={{ gap: 20 }}>
          <AppIcon size={64} />
          <View style={{ gap: 10 }}>
            <T variant="display">FantesDay</T>
            <T style={styles.tagline}>Hábitos, treinos e alimentação.{'\n'}Seu dia, nível por nível.</T>
          </View>
        </View>

        <View style={{ gap: 16 }}>
          {formError ? <ErrorBanner title="Não foi possível entrar" message={formError} /> : null}
          <Field
            label="E-mail"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setErrors((e) => ({ ...e, email: undefined }));
            }}
            placeholder="voce@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            error={errors.email}
          />
          <Field
            label="Senha"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrors((e) => ({ ...e, password: undefined }));
            }}
            placeholder="Sua senha"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            error={errors.password}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                onPress={() => setShowPassword((s) => !s)}
                hitSlop={12}
                style={styles.eye}
              >
                <Text style={styles.eyeText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
              </Pressable>
            }
          />
          <Link href="/esqueci-senha" asChild>
            <Pressable accessibilityRole="link" hitSlop={8} style={styles.forgot}>
              <Text style={styles.link}>Esqueci minha senha</Text>
            </Pressable>
          </Link>
          <Button title="Entrar" onPress={submit} loading={pending} disabled={bioPending} style={{ marginTop: 4 }} />
        </View>

        {biometricReady ? (
          <>
            <View style={styles.divider}>
              <View style={styles.line} />
              <T variant="caption" style={{ fontFamily: fonts.semibold }}>ou</T>
              <View style={styles.line} />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={biometric}
              disabled={bioPending || pending}
              style={({ pressed }) => [styles.faceId, (pressed || bioPending) && { opacity: 0.7 }]}
            >
              <Icon name="faceId" size={22} color={colors.accent} />
              <Text style={styles.faceIdText}>{bioPending ? 'Aguardando Face ID…' : 'Entrar com Face ID'}</Text>
            </Pressable>
          </>
        ) : null}

        <View style={styles.bottom}>
          <T style={styles.bottomText}>Novo por aqui? </T>
          <Pressable accessibilityRole="link" hitSlop={10} onPress={() => router.push('/cadastro')}>
            <Text style={[styles.link, { fontSize: 14 }]}>Criar conta</Text>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 88, gap: 30, flexGrow: 1 },
  tagline: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.textMuted },
  eye: { minHeight: 44, justifyContent: 'center' },
  eyeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted },
  forgot: { alignSelf: 'flex-end', paddingVertical: 6, marginTop: -6 },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: -12 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  faceId: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  faceIdText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  bottom: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bottomText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
});
