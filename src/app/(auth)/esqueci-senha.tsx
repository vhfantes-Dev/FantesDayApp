import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { authApi } from '@/api/endpoints';
import { EnvelopeAnimation } from '@/components/conta/Illustrations';
import { Button, ErrorBanner, Field, IconButton, Screen, T } from '@/components/ui';
import { colors, fonts } from '@/theme';

export default function EsqueciSenhaScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  }

  async function submit() {
    const value = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError('Informe um e-mail válido.');
      return;
    }
    setError(null);
    setFormError(null);
    setPending(true);
    try {
      await authApi.forgotPassword(value);
      router.push({ pathname: '/redefinir-senha', params: { email: value } });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen glow="none" contentStyle={styles.content}>
        <View pointerEvents="none" style={styles.glow} />
        <IconButton icon="back" label="Voltar" onPress={back} />

        <EnvelopeAnimation />

        <View style={{ gap: 10 }}>
          <T variant="display" style={{ fontSize: 26 }}>Esqueceu a senha?</T>
          <T style={styles.lead}>
            Informe seu e-mail. Se ele tiver conta, enviamos um código de 6 dígitos para criar uma senha nova.
          </T>
        </View>

        {formError ? <ErrorBanner title="Não foi possível enviar" message={formError} /> : null}

        <Field
          label="E-mail"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          placeholder="voce@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          autoFocus={!params.email}
          returnKeyType="send"
          onSubmitEditing={submit}
          error={error}
        />

        <Button title="Enviar código" onPress={submit} loading={pending} />

        <T variant="caption" style={{ textAlign: 'center', lineHeight: 18 }}>
          Por enquanto o código não chega por e-mail: ele aparece no log da API.
        </T>

        <View style={styles.bottom}>
          <T style={styles.bottomText}>Lembrou? </T>
          <Pressable accessibilityRole="link" hitSlop={10} onPress={back}>
            <Text style={styles.link}>Entrar</Text>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, gap: 22, flexGrow: 1 },
  glow: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    width: 280,
    height: 260,
    borderRadius: 140,
    backgroundColor: colors.accent,
    opacity: 0.06,
  },
  lead: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  bottom: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bottomText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },
});
