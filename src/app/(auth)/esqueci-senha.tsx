import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { authApi } from '@/api/endpoints';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, ErrorBanner, Field, IconButton, Screen, T } from '@/components/ui';
import { colors, fonts } from '@/theme';

type Errors = Partial<Record<'email' | 'code' | 'password' | 'confirm', string>>;

export default function EsqueciSenhaScreen() {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function back() {
    if (step === 2) {
      setStep(1);
      setFormError(null);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  }

  async function requestCode() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrors({ email: 'Informe um e-mail válido.' });
      return;
    }
    setErrors({});
    setFormError(null);
    setPending(true);
    try {
      await authApi.forgotPassword(email.trim());
      setStep(2);
      toast.success('Código enviado');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');
    } finally {
      setPending(false);
    }
  }

  async function reset() {
    const next: Errors = {};
    if (!/^\d{6}$/.test(code)) next.code = 'O código tem 6 dígitos.';
    if (password.length < 8 || password.length > 72) next.password = 'A senha precisa ter de 8 a 72 caracteres.';
    if (confirm !== password) next.confirm = 'As senhas não conferem.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      await authApi.resetPassword(email.trim(), code, password);
      toast.success('Senha alterada. Entre com a nova senha.');
      router.replace('/login');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.';
      if (/c[oó]digo/i.test(message)) setErrors({ code: message });
      else setFormError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        contentStyle={{ paddingHorizontal: 24, gap: 28 }}
        footer={
          step === 1 ? (
            <Button title="Enviar código" onPress={requestCode} loading={pending} />
          ) : (
            <Button title="Salvar nova senha" onPress={reset} loading={pending} />
          )
        }
      >
        <IconButton icon="back" label="Voltar" onPress={back} />

        <View style={{ gap: 10 }}>
          <T variant="display" style={{ fontSize: 28 }}>
            {step === 1 ? 'Esqueci a senha' : 'Nova senha'}
          </T>
          <T style={styles.lead}>
            {step === 1
              ? 'Informe o e-mail da sua conta. Vamos gerar um código de 6 dígitos para você criar uma senha nova.'
              : `Digite o código gerado para ${email.trim()} e escolha uma senha nova.`}
          </T>
        </View>

        <View style={{ gap: 16 }}>
          {formError ? <ErrorBanner title="Não foi possível continuar" message={formError} /> : null}

          {step === 1 ? (
            <Field
              label="E-mail"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setErrors({});
              }}
              placeholder="voce@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              autoFocus
              returnKeyType="send"
              onSubmitEditing={requestCode}
              error={errors.email}
            />
          ) : (
            <>
              <Field
                label="Código"
                value={code}
                onChangeText={(t) => {
                  setCode(t.replace(/\D/g, '').slice(0, 6));
                  setErrors((e) => ({ ...e, code: undefined }));
                }}
                placeholder="000000"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
                error={errors.code}
              />
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
                error={errors.password}
              />
              <Field
                label="Confirmar nova senha"
                value={confirm}
                onChangeText={(t) => {
                  setConfirm(t);
                  setErrors((e) => ({ ...e, confirm: undefined }));
                }}
                placeholder="Repita a senha"
                secureTextEntry
                autoCapitalize="none"
                maxLength={72}
                returnKeyType="done"
                onSubmitEditing={reset}
                error={errors.confirm}
              />
              <Pressable accessibilityRole="button" onPress={requestCode} disabled={pending} hitSlop={8} style={styles.resend}>
                <Text style={styles.link}>Gerar outro código</Text>
              </Pressable>
            </>
          )}

          <View style={styles.note}>
            <Icon name="alert" size={18} color={colors.carbs} />
            <T variant="caption" style={{ flex: 1, lineHeight: 18 }}>
              Por enquanto o código não chega por e-mail: ele aparece no log da API. O código vale 15 minutos e
              aceita 5 tentativas.
            </T>
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  resend: { alignSelf: 'flex-start', paddingVertical: 8 },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  note: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.carbsSoft,
  },
});
