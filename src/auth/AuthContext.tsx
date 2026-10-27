import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { configureSession } from '@/api/client';
import { authApi, userApi } from '@/api/endpoints';
import type { AuthResponse, User, UserRequest } from '@/api/types';
import { KEYS, secureStorage } from './storage';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  user: User | null;
  // Há uma sessão guardada esperando a biometria para entrar.
  biometricReady: boolean;
  biometricAvailable: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: UserRequest & { enableBiometric?: boolean }) => Promise<void>;
  signInWithBiometrics: () => Promise<boolean>;
  signOut: () => Promise<void>;
  applyAuth: (auth: AuthResponse) => Promise<void>;
  setUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<User | null>(null);
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const refreshRef = useRef<string | null>(null);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    refreshRef.current = null;
    await secureStorage.remove(KEYS.refreshToken);
    setUserState(null);
    setBiometricReady(false);
    setStatus('signedOut');
  }, []);

  const applyAuth = useCallback(async (auth: AuthResponse) => {
    tokenRef.current = auth.token;
    refreshRef.current = auth.refreshToken;
    await secureStorage.set(KEYS.refreshToken, auth.refreshToken);
    setUserState(auth.user);
    setStatus('signedIn');
  }, []);

  const refresh = useCallback(async (): Promise<AuthResponse | null> => {
    const stored = refreshRef.current ?? (await secureStorage.get(KEYS.refreshToken));
    if (!stored) return null;
    try {
      const auth = await authApi.refresh(stored);
      tokenRef.current = auth.token;
      refreshRef.current = auth.refreshToken;
      await secureStorage.set(KEYS.refreshToken, auth.refreshToken);
      setUserState(auth.user);
      return auth;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    configureSession({
      getToken: () => tokenRef.current,
      refresh,
      onSessionExpired: () => {
        void clearSession();
      },
    });
  }, [refresh, clearSession]);

  // Ao abrir o app: com biometria ligada, espera o Face ID; sem ela, renova a sessão direto.
  useEffect(() => {
    (async () => {
      const hasHardware =
        Platform.OS !== 'web' &&
        (await LocalAuthentication.hasHardwareAsync()) &&
        (await LocalAuthentication.isEnrolledAsync());
      setBiometricAvailable(hasHardware);
      const stored = await secureStorage.get(KEYS.refreshToken);
      if (!stored) {
        setStatus('signedOut');
        return;
      }
      refreshRef.current = stored;
      const biometricOn = (await secureStorage.get(KEYS.biometric)) === '1';
      if (biometricOn && hasHardware) {
        setBiometricReady(true);
        setStatus('signedOut');
        return;
      }
      const auth = await refresh();
      if (auth) setStatus('signedIn');
      else await clearSession();
    })();
  }, [refresh, clearSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const auth = await authApi.login(email.trim(), password);
      await applyAuth(auth);
      if (auth.user.faceIdEnabled) await secureStorage.set(KEYS.biometric, '1');
    },
    [applyAuth],
  );

  const signUp = useCallback(
    async ({ enableBiometric, ...data }: UserRequest & { enableBiometric?: boolean }) => {
      const auth = await authApi.register({ ...data, faceIdEnabled: !!enableBiometric });
      await applyAuth(auth);
      await secureStorage.set(KEYS.biometric, enableBiometric ? '1' : '0');
    },
    [applyAuth],
  );

  const signInWithBiometrics = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Entrar no FantesDay',
      cancelLabel: 'Cancelar',
    });
    if (!result.success) return false;
    const auth = await refresh();
    if (!auth) {
      await clearSession();
      return false;
    }
    setBiometricReady(false);
    setStatus('signedIn');
    return true;
  }, [refresh, clearSession]);

  const signOut = useCallback(async () => {
    const token = refreshRef.current;
    if (token) {
      try {
        await authApi.logout(token);
      } catch {
        // Sai localmente mesmo se a API estiver fora do ar.
      }
    }
    await clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUserState(me);
  }, []);

  const setBiometricEnabled = useCallback(
    async (enabled: boolean) => {
      await secureStorage.set(KEYS.biometric, enabled ? '1' : '0');
      if (user) setUserState(await userApi.update(user.id, { faceIdEnabled: enabled }));
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      biometricReady,
      biometricAvailable,
      signIn,
      signUp,
      signInWithBiometrics,
      signOut,
      applyAuth,
      setUser: setUserState,
      refreshUser,
      setBiometricEnabled,
    }),
    [status, user, biometricReady, biometricAvailable, signIn, signUp, signInWithBiometrics, signOut, applyAuth, refreshUser, setBiometricEnabled],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro do AuthProvider');
  return ctx;
}

// Atalho para telas autenticadas: o id do usuário logado.
// Ao sair, a tela ainda pode renderizar uma última vez sem usuário: mantém o último id em vez de quebrar.
export function useUserId() {
  const { user } = useAuth();
  const last = useRef<number>(user?.id ?? 0);
  if (user) last.current = user.id;
  return last.current;
}
