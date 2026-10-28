import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from '@/theme';
import { LogoMark } from './Logo';

// Splash desenhado pelo app: o mesmo logo da splash nativa, no mesmo tamanho e posição.
// Aparece também no Expo Go e na web (onde a splash nativa não existe) e some com um fade
// quando as fontes e a sessão terminam de carregar.
export function BootSplash({ ready, children }: { ready: boolean; children: ReactNode }) {
  const { width } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!ready) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 350, delay: 150, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.08, duration: 500, delay: 150, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [ready, opacity, scale]);

  // A splash nativa usa imageWidth 200 sobre a imagem de 1024 px; o logo ocupa a mesma área.
  const size = Math.min(200, width * 0.6);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {ready ? children : null}
      {visible && (
        <Animated.View
          pointerEvents={ready ? 'none' : 'auto'}
          accessibilityLabel="Carregando o FantesDay"
          style={[StyleSheet.absoluteFill, styles.center, { opacity }]}
          // Troca a splash nativa pela desenhada sem piscar.
          onLayout={() => void SplashScreen.hideAsync()}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <LogoMark size={size} />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
