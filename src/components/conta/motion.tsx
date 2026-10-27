import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

// true quando o sistema pede menos movimento (as animações ficam paradas no estado final).
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

// Valor de 0 a 1 que se repete (linear). Parado em `rest` com movimento reduzido ou desligado.
export function useLoop(duration: number, { enabled = true, rest = 0, native = true } = {}) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(rest)).current;
  useEffect(() => {
    if (reduced || !enabled) {
      value.stopAnimation();
      value.setValue(rest);
      return;
    }
    value.setValue(0);
    const anim = Animated.loop(
      Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: native }),
    );
    anim.start();
    return () => anim.stop();
  }, [reduced, enabled, duration, rest, native, value]);
  return value;
}

// Valor de 0 a 1 que anima uma vez (ex: desenhar o gráfico). Muda `key` para repetir.
export function useOnce(duration: number, { delay = 0, native = true, trigger }: { delay?: number; native?: boolean; trigger?: unknown } = {}) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      value.setValue(1);
      return;
    }
    value.setValue(0);
    const anim = Animated.timing(value, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: native,
    });
    anim.start();
    return () => anim.stop();
  }, [reduced, duration, delay, native, trigger, value]);
  return value;
}

// Entrada suave (sobe 12 px e aparece).
export function FadeIn({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useOnce(650, { delay });
  return (
    <Animated.View
      style={[
        style,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}
