import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { absoluteUrl, authHeader } from '@/api/client';
import { userApi } from '@/api/endpoints';
import type { User } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { colors, fonts } from '@/theme';
import { initials } from '@/utils/format';

// Foto do usuário (a rota da foto exige o token) ou as iniciais.
export function UserPhoto({
  user,
  size,
  borderRadius,
  version,
}: {
  user: Pick<User, 'name' | 'photoUrl'>;
  size: number;
  borderRadius: number;
  // Muda a URL para furar o cache depois de trocar a foto.
  version?: number;
}) {
  const [failed, setFailed] = useState(false);
  const base = absoluteUrl(user.photoUrl);
  const uri = base ? `${base}${base.includes('?') ? '&' : '?'}v=${version ?? 0}` : null;
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius }]}>
      {uri && !failed ? (
        <Image
          source={{ uri, headers: authHeader() }}
          style={{ width: size, height: size, borderRadius }}
          onError={() => setFailed(true)}
          accessibilityLabel={`Foto de ${user.name}`}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.3 }]}>{initials(user.name)}</Text>
      )}
    </View>
  );
}

// Confirmação forte para excluir a conta e todos os dados.
export function useDeleteAccount() {
  const { user, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  function confirm() {
    if (!user) return;
    Alert.alert(
      'Excluir sua conta?',
      'Apaga seu usuário, progresso, tarefas, refeições, treinos e atividades. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Tem certeza absoluta?', 'Todos os seus dados serão apagados para sempre.', [
              { text: 'Manter conta', style: 'cancel' },
              {
                text: 'Excluir tudo',
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  try {
                    await userApi.remove(user.id);
                    await signOut();
                  } catch (e) {
                    setDeleting(false);
                    Alert.alert('Não foi possível excluir', e instanceof Error ? e.message : 'Tente de novo.');
                  }
                },
              },
            ]),
        },
      ],
    );
  }

  return { confirm, deleting };
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { fontFamily: fonts.title, color: colors.text },
});
