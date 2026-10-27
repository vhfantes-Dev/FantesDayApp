import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { authApi } from '@/api/endpoints';
import { LockAnimation } from '@/components/conta/Illustrations';
import { useLoop } from '@/components/conta/motion';
import { useToast } from '@/components/Toast';
import { Button, ErrorBanner, Field, IconButton, Screen, T } from '@/components/ui';
import { colors, fonts } from '@/theme';

type Errors = Partial<Record<'code' | 'password', string>>;

// "vitor@exemplo.com" → "v***@exemplo.com"
function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 1)}***@${domain}`;
}

// 0 a 4 barras.
function passwordStrength(p: string) {
  if (!p) return 0;
  let score = p.length >= 8 ? 1 : 0;
  if (p.length >= 12) score += 1;
  if (/[a-zA-Z]/.test(p) && /\d/.test(p)) score += 1;
  if (/[^a-zA-Z0-9]/.test(p) || (/[a-z]/.test(p) && /[A-Z]/.test(p))) score += 1;
  return Math.max(1, score);
}

export default function RedefinirSenhaScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const toast = useToast();
  const codeRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [code, setCode] = useState('');
  const [codeFocused, setCodeFocused] = useState(true);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const blink = useLoop(1000);
  const caretOpacity = blink.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [1, 1, 0, 0] });

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/esqueci-senha', params: { email } });
  }

  async function resend() {
    if (!email) return back();
    setResending(true);
    try {
      await authApi.forgotPassword(email);
      setCode('');
      toast.success('Código reenviado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível reenviar.');
    } finally {
      setResending(false);
    }
  }

  async function submit() {
    const next: Errors = {};
    if (!/^\d{6}$/.test(code)) next.code = 'Digite os 6 dígitos do código.';
    if (password.length < 8 || password.length > 72) next.password = 'A senha precisa ter de 8 a 72 caracteres.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      await authApi.resetPassword(email, code, password);
      toast.success('Senha alterada. Entre com a nova senha.');
      router.dismissTo('/login');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.';
      if (/c[oó]digo|tentativa/i.test(message)) setErrors({ code: message });
      else if (/senha/i.test(message)) setErrors({ password: message });
      else setFormError(message);
    } finally {
      setPending(false);
    }
  }

  const strength = passwordStrength(password);
  const strengthColor = strength <= 1 ? colors.danger : strength === 2 ? colors.carbs : colors.accent;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        contentStyle={{ paddingHorizontal: 24, gap: 20 }}
        footer={<Button title="Salvar nova senha" onPress={submit} loading={pending} />}
      >
        <IconButton icon="back" label="Voltar" onPress={back} />
        <LockAnimation />

        <View style={{ gap: 10 }}>
          <T variant="display" style={{ fontSize: 26 }}>Digite o código</T>
          <T style={styles.lead}>
            Enviamos para <Text style={{ color: colors.text, fontFamily: fonts.bold }}>{maskEmail(email)}</Text>.
          </T>
        </View>

        {formError ? <ErrorBanner title="Não foi possível redefinir" message={formError} /> : null}

        <View style={{ gap: 8 }}>
          <Pressable
            onPress={() => codeRef.current?.focus()}
            style={styles.codeRow}
            accessibilityLabel={`Código de 6 dígitos, ${code.length} digitados`}
          >
            {Array.from({ length: 6 }).map((_, i) => {
              const digit = code[i];
              const current = codeFocused && i === Math.min(code.length, 5) && code.length < 6;
              return (
                <View
                  key={i}
                  style={[
                    styles.codeBox,
                    digit ? styles.codeBoxFilled : null,
                    current ? styles.codeBoxCurrent : null,
                    errors.code ? { borderColor: colors.danger } : null,
                  ]}
                >
                  {digit ? (
                    <Text style={styles.codeDigit}>{digit}</Text>
                  ) : current ? (
                    <Animated.View style={[styles.caret, { opacity: caretOpacity }]} />
                  ) : null}
                </View>
              );
            })}
          </Pressable>
          <TextInput
            ref={codeRef}
            value={code}
            onChangeText={(t) => {
              setCode(t.replace(/\D/g, '').slice(0, 6));
              setErrors((e) => ({ ...e, code: undefined }));
            }}
            onFocus={() => setCodeFocused(true)}
            onBlur={() => setCodeFocused(false)}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            caretHidden
            style={styles.hiddenInput}
            accessibilityLabel="Código de 6 dígitos"
          />
          {errors.code ? (
            <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold }}>{errors.code}</T>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T variant="caption" style={{ fontSize: 13 }}>Não chegou? </T>
            <Pressable accessibilityRole="button" onPress={resend} disabled={resending} hitSlop={10} style={{ paddingVertical: 8 }}>
              <Text style={[styles.link, resending && { opacity: 0.5 }]}>{resending ? 'Reenviando…' : 'Reenviar código'}</Text>
            </Pressable>
          </View>
          <T variant="caption" style={{ fontSize: 11 }}>Por enquanto o código aparece no log da API.</T>
        </View>

        <View style={{ gap: 8 }}>
          <Field
            label="Nova senha"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrors((e) => ({ ...e, password: undefined }));
            }}
            placeholder="Mínimo de 8 caracteres"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={72}
            returnKeyType="done"
            onSubmitEditing={submit}
            error={errors.password}
          />
          <View style={styles.bars} accessibilityLabel={`Força da senha: ${strength} de 4`}>
            {[1, 2, 3, 4].map((n) => (
              <View key={n} style={[styles.bar, { backgroundColor: n <= strength ? strengthColor : colors.border }]} />
            ))}
          </View>
          <T variant="caption">Entre 8 e 72 caracteres · as sessões em outros aparelhos serão encerradas</T>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  codeRow: { flexDirection: 'row', gap: 8 },
  codeBox: {
    flex: 1,
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: { borderColor: '#3A4A26', backgroundColor: colors.accentSoft },
  codeBoxCurrent: { borderWidth: 2, borderColor: colors.accent },
  codeDigit: { fontFamily: fonts.title, fontSize: 24, color: colors.text },
  caret: { width: 2, height: 26, backgroundColor: colors.accent },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 5, borderRadius: 99 },
});
