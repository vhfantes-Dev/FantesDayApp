import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';
import { useLoop, useReducedMotion } from './motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const fill = StyleSheet.absoluteFill;

// Envelope flutuando, abrindo a aba e soltando o cartão (Esqueci a senha).
export function EnvelopeAnimation() {
  const t = useLoop(3200);
  const trail = useLoop(1000, { native: false });
  const translateY = t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -5, -8, -5, 0] });
  const rotate = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-3deg', '3deg', '-3deg'] });
  const flap = t.interpolate({ inputRange: [0, 0.4, 0.55, 0.8, 1], outputRange: [1, 1, -1, -1, 1] });
  const cardY = t.interpolate({ inputRange: [0, 0.5, 0.65, 1], outputRange: [0, 0, -26, -26] });
  const cardOpacity = t.interpolate({ inputRange: [0, 0.5, 0.65, 0.85, 1], outputRange: [0, 0, 1, 1, 0] });
  const reduced = useReducedMotion();

  return (
    <View style={{ width: 200, height: 150, alignSelf: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={200} height={150} viewBox="0 0 200 150" style={fill}>
        <AnimatedPath
          d="M20 120 C50 100 60 130 90 110"
          fill="none"
          stroke={colors.borderDashed}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="6 8"
          strokeDashoffset={trail.interpolate({ inputRange: [0, 1], outputRange: [0, -28] })}
        />
        <Circle cx={160} cy={40} r={3} fill={colors.accent} />
        <Circle cx={40} cy={44} r={2} fill={colors.accent} />
        <Circle cx={170} cy={96} r={2} fill={colors.accent} />
      </Svg>
      <Animated.View style={[fill, { transform: [{ translateY }, { rotate }] }]}>
        <Animated.View style={[fill, { opacity: reduced ? 0 : cardOpacity, transform: [{ translateY: cardY }] }]}>
          <Svg width={200} height={150} viewBox="0 0 200 150">
            <Rect x={76} y={58} width={48} height={34} rx={5} fill={colors.text} />
          </Svg>
        </Animated.View>
        <Svg width={200} height={150} viewBox="0 0 200 150" style={fill}>
          <Rect x={56} y={60} width={88} height={62} rx={10} fill={colors.surface2} stroke={colors.accent} strokeWidth={2.5} />
          <Path d="M58 66 L100 96 L142 66" fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinejoin="round" />
        </Svg>
        <Animated.View
          style={{ position: 'absolute', left: 56, top: 60, width: 88, height: 34, transformOrigin: 'top', transform: [{ scaleY: flap }] }}
        >
          <Svg width={88} height={34} viewBox="56 60 88 34">
            <Path d="M58 62 L100 92 L142 62 Z" fill={colors.border} stroke={colors.accent} strokeWidth={2.5} strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// Cadeado fechando (Redefinir senha).
export function LockAnimation() {
  const t = useLoop(2800);
  const translateY = t.interpolate({ inputRange: [0, 0.4, 0.55, 1], outputRange: [-5, -5, 0, 0] });
  return (
    <View style={{ width: 64, height: 72 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[fill, { transform: [{ translateY }] }]}>
        <Svg width={64} height={72} viewBox="0 0 64 72">
          <Path d="M18 34 V22 a14 14 0 0 1 28 0 V34" fill="none" stroke={colors.accent} strokeWidth={5} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Svg width={64} height={72} viewBox="0 0 64 72" style={fill}>
        <Rect x={8} y={32} width={48} height={36} rx={10} fill={colors.accent} />
        <Circle cx={32} cy={48} r={5} fill={colors.onAccent} />
        <Rect x={30} y={50} width={4} height={9} rx={2} fill={colors.onAccent} />
      </Svg>
    </View>
  );
}

// Escudo pulsando com o visto sendo desenhado (Alterar senha).
export function ShieldAnimation() {
  const t = useLoop(3000, { native: false, rest: 1 });
  const scale = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.05, 1] });
  const dash = t.interpolate({ inputRange: [0, 0.2, 0.45, 1], outputRange: [40, 40, 0, 0] });
  return (
    <Animated.View
      style={{ width: 90, height: 100, alignSelf: 'center', transform: [{ scale }] }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={90} height={100} viewBox="0 0 90 100">
        <Path d="M45 4 L82 18 V48 C82 72 66 88 45 96 C24 88 8 72 8 48 V18 Z" fill={colors.accentSoft} stroke={colors.accent} strokeWidth={3} />
        <AnimatedPath
          d="M28 50 L40 62 L63 38"
          fill="none"
          stroke={colors.accent}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="40"
          strokeDashoffset={dash}
        />
      </Svg>
    </Animated.View>
  );
}

// App de saúde → FantesDay com pacotes passando (Importar atividades). Só anima enquanto `active`.
export function SyncAnimation({ active, sourceColor = colors.fat }: { active: boolean; sourceColor?: string }) {
  const reduced = useReducedMotion();
  const run = active && !reduced;
  const spin = useLoop(2400, { enabled: run });
  const flow = useLoop(1200, { enabled: run, native: false });
  const packets = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    if (!run) {
      packets.forEach((p) => p.setValue(0));
      return;
    }
    const anims = packets.map((p, i) =>
      Animated.sequence([
        Animated.delay(i * 800),
        Animated.loop(
          Animated.timing(p, { toValue: 1, duration: 2400, easing: Easing.bezier(0.45, 0, 0.55, 1), useNativeDriver: true }),
        ),
      ]),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const packetColors = [sourceColor, colors.protein, colors.accent];
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ width: 300, height: 110, alignSelf: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={300} height={110} viewBox="0 0 300 110" style={fill}>
        <Rect x={10} y={20} width={70} height={70} rx={20} fill={colors.fatSoft} stroke={sourceColor} strokeWidth={1.5} />
        <Path d="M45 70 C30 60 26 50 26 44 A9 9 0 0 1 45 40 A9 9 0 0 1 64 44 C64 50 60 60 45 70 Z" fill={sourceColor} />
        <AnimatedLine
          x1={86}
          y1={55}
          x2={214}
          y2={55}
          stroke={colors.borderDashed}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="4 10"
          strokeDashoffset={flow.interpolate({ inputRange: [0, 1], outputRange: [0, -28] })}
        />
        <Rect x={220} y={20} width={70} height={70} rx={20} fill={colors.accent} />
      </Svg>
      {packets.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: 81,
            top: 50,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: packetColors[i],
            opacity: run ? p.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }) : 0,
            transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, 150] }) }],
          }}
        />
      ))}
      <Animated.View style={{ position: 'absolute', left: 220, top: 20, width: 70, height: 70, transform: [{ rotate }] }}>
        <Svg width={70} height={70} viewBox="220 20 70 70">
          <Path d="M255 37 A18 18 0 1 1 238 49" fill="none" stroke={colors.onAccent} strokeWidth={4} strokeLinecap="round" />
          <Path d="M234 42 L238 50 L246 46" fill="none" stroke={colors.onAccent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}
