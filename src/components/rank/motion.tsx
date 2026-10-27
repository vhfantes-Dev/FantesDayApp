import { type ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';

// null enquanto a preferência do sistema ainda não foi lida.
export function useReduceMotion(): boolean | null {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => alive && setReduce(r))
      .catch(() => alive && setReduce(false));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (r) => setReduce(r));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

// Tela cheia das celebrações: fundo, áreas seguras e botão fixo no rodapé.
export function CelebrationLayout({
  background = colors.bgDeep,
  children,
  backdrop,
  buttonTitle,
  buttonColor = colors.accent,
  onPress,
  contentStyle,
}: {
  background?: string;
  children: ReactNode;
  backdrop?: ReactNode;
  buttonTitle: string;
  buttonColor?: string;
  onPress: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      {backdrop}
      <View style={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }, contentStyle]}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} bounces={false}>
          {children}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.button, { backgroundColor: buttonColor, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.buttonText}>{buttonTitle}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export interface Particle {
  x: number;
  y: number;
  color: string;
  size: number;
  round?: boolean;
  w?: number;
  h?: number;
  spin?: boolean;
}

// Partículas que saem do centro (confete/faíscas) conforme `progress` vai de 0 a 1.
export function Burst({ progress, particles, left, top }: { progress: Animated.Value; particles: Particle[]; left: number; top: number }) {
  return (
    <>
      {particles.map((p, i) => {
        const w = p.w ?? p.size;
        const h = p.h ?? p.size;
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: left - w / 2,
              top: top - h / 2,
              width: w,
              height: h,
              borderRadius: p.round ? h / 2 : 2,
              backgroundColor: p.color,
              opacity: progress.interpolate({ inputRange: [0, 0.15, 0.6, 1], outputRange: [0, 1, 0.8, 0] }),
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.y] }) },
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                ...(p.spin ? [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '260deg'] }) }] : []),
              ],
            }}
          />
        );
      })}
    </>
  );
}

// Brilho difuso (substitui o blur do CSS por círculos concêntricos translúcidos).
export function Glow({ color, size, style, opacity = 1 }: { color: string; size: number; style?: StyleProp<ViewStyle>; opacity?: number | Animated.AnimatedInterpolation<number> | Animated.Value }) {
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity }, style]}>
      {[1, 0.78, 0.56, 0.36].map((k) => (
        <View
          key={k}
          style={{ position: 'absolute', width: size * k, height: size * k, borderRadius: (size * k) / 2, backgroundColor: color, opacity: 0.09 }}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: 28 },
  body: { flexGrow: 1, alignItems: 'center', gap: 18, paddingTop: 24 },
  button: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonText: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.onAccent },
});
