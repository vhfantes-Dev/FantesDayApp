import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Unbounded_500Medium, Unbounded_600SemiBold, Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { BootSplash } from '@/components/BootSplash';
import { consumeOnboardingPending } from '@/components/conta/onboardingFlag';
import { ToastProvider } from '@/components/Toast';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status } = useAuth();

  // Logo depois do cadastro: espera a pilha autenticada montar e abre o onboarding por cima da Home.
  useEffect(() => {
    if (status !== 'signedIn' || !consumeOnboardingPending()) return;
    const timer = setTimeout(() => router.push('/onboarding'), 0);
    return () => clearTimeout(timer);
  }, [status]);

  if (status === 'loading') return null;

  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="celebracao/nivel" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="celebracao/rank" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="celebracao/sequencia" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="celebracao/ranking" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="alimentos/scanner" options={{ presentation: 'fullScreenModal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Unbounded_500Medium,
    Unbounded_600SemiBold,
    Unbounded_700Bold,
  });

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <AuthProvider>
        <ToastProvider>
          <AppShell fontsLoaded={fontsLoaded} />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// Mostra a splash com o logo até as fontes e a sessão carregarem.
function AppShell({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status } = useAuth();
  return (
    <BootSplash ready={fontsLoaded && status !== 'loading'}>
      <RootNavigator />
    </BootSplash>
  );
}
