import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorBanner, SuccessBanner } from './ui';

type Tone = 'success' | 'error';

interface ToastState {
  id: number;
  message: string;
  tone: Tone;
  title?: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Avisos curtos no topo da tela ("Tarefa concluída · +10 XP", erros da API).
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const show = useCallback(
    (message: string, tone: Tone, title?: string) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: ++counter.current, message, tone, title });
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(
          tone === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
        );
      }
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
      }, 2600);
    },
    [opacity],
  );

  const api = useRef<ToastApi>({
    success: (m) => show(m, 'success'),
    error: (m, t) => show(m, 'error', t),
  });
  api.current.success = (m) => show(m, 'success');
  api.current.error = (m, t) => show(m, 'error', t);

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            {
              top: insets.top + 8,
              opacity,
              transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
            },
          ]}
        >
          <View>
            {toast.tone === 'success' ? (
              <SuccessBanner message={toast.message} />
            ) : (
              <ErrorBanner title={toast.title ?? 'Algo deu errado'} message={toast.message} />
            )}
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro do ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 100 },
});
