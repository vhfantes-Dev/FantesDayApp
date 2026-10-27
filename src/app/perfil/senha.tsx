import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { authApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { ShieldAnimation } from '@/components/conta/Illustrations';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, ErrorBanner, Field, Header, Screen, T } from '@/components/ui';
import { colors } from '@/theme';

type Errors = Partial<Record<'current' | 'next' | 'confirm', string>>;

export default function AlterarSenhaScreen() {
  const { applyAuth } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    const e: Errors = {};
    if (!current) e.current = 'Informe a senha atual.';
    if (next.length < 8 || next.length > 72) e.next = 'A senha precisa ter de 8 a 72 caracteres.';
    else if (next === current) e.next = 'A nova senha deve ser diferente da atual.';
    if (confirm !== next) e.confirm = 'As senhas não conferem.';
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    setPending(true);
    try {
      // A API encerra as outras sessões e devolve tokens novos para este aparelho.
      await applyAuth(await authApi.changePassword(current, next));
      toast.success('Senha alterada');
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Algo deu errado. Tente de novo.';
      if (/atual/i.test(message)) setErrors({ current: 'Senha atual incorreta.' });
      else if (/senha/i.test(message)) setErrors({ next: message });
      else setFormError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen footer={<Button title="Salvar nova senha" onPress={submit} loading={pending} />}>
        <Header title="Alterar senha" />
        <View style={{ paddingVertical: 6 }}>
          <ShieldAnimation />
        </View>

        {formError ? <ErrorBanner title="Não foi possível alterar" message={formError} /> : null}

        <Field
          label="Senha atual"
          value={current}
          onChangeText={(t) => {
            setCurrent(t);
            setErrors((x) => ({ ...x, current: undefined }));
          }}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          autoFocus
          error={errors.current}
        />
        <Field
          label="Nova senha"
          value={next}
          onChangeText={(t) => {
            setNext(t);
            setErrors((x) => ({ ...x, next: undefined }));
          }}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={72}
          hint="Entre 8 e 72 caracteres"
          error={errors.next}
        />
        <Field
          label="Confirmar nova senha"
          value={confirm}
          onChangeText={(t) => {
            setConfirm(t);
            setErrors((x) => ({ ...x, confirm: undefined }));
          }}
          secureTextEntry
          autoCapitalize="none"
          maxLength={72}
          returnKeyType="done"
          onSubmitEditing={submit}
          error={errors.confirm}
        />

        <View style={styles.info}>
          <Icon name="faceId" size={18} color={colors.protein} />
          <T variant="caption" color="#A9B8DA" style={{ flex: 1, lineHeight: 18 }}>
            Você continua conectado neste aparelho. As sessões em outros aparelhos são encerradas, e o Face ID passa a
            usar a nova sessão automaticamente.
          </T>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  info: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.proteinSoft,
    borderWidth: 1,
    borderColor: '#26345A',
  },
});
