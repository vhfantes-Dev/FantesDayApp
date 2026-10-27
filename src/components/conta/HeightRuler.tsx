import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Svg, { Line, Text as SvgText } from 'react-native-svg';

import { T } from '@/components/ui';
import { colors, fonts } from '@/theme';

const MIN = 120;
const MAX = 220;
const STEP = 12; // px por cm

// Régua horizontal para escolher a altura (arrastar para os lados).
export function HeightRuler({ value, onChange }: { value: number; onChange: (cm: number) => void }) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [width, setWidth] = useState(0);
  const positioned = useRef(false);
  const clamped = Math.min(MAX, Math.max(MIN, Math.round(value)));

  useEffect(() => {
    if (width && !positioned.current) {
      positioned.current = true;
      ref.current?.scrollTo({ x: (clamped - MIN) * STEP, animated: false });
    }
  }, [width, clamped]);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const cm = Math.min(MAX, Math.max(MIN, MIN + Math.round(e.nativeEvent.contentOffset.x / STEP)));
    if (cm !== clamped) onChange(cm);
  }

  const count = MAX - MIN;
  const svgWidth = count * STEP + 2;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <T variant="label">Altura</T>
        <Text style={styles.value} accessibilityLiveRegion="polite">
          {clamped}
          <Text style={styles.unit}> cm</Text>
        </Text>
      </View>
      <View
        style={styles.track}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Altura"
        accessibilityValue={{ min: MIN, max: MAX, now: clamped, text: `${clamped} centímetros` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const next = clamped + (e.nativeEvent.actionName === 'increment' ? 1 : -1);
          const cm = Math.min(MAX, Math.max(MIN, next));
          onChange(cm);
          ref.current?.scrollTo({ x: (cm - MIN) * STEP, animated: true });
        }}
      >
        {width ? (
          <ScrollView
            ref={ref}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={STEP}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={onScroll}
            contentContainerStyle={{ paddingHorizontal: width / 2 - 1 }}
          >
            <Svg width={svgWidth} height={46}>
              {Array.from({ length: count + 1 }).map((_, i) => {
                const cm = MIN + i;
                const major = cm % 5 === 0;
                const x = 1 + i * STEP;
                return (
                  <Line
                    key={cm}
                    x1={x}
                    x2={x}
                    y1={major ? 4 : 10}
                    y2={major ? 28 : 22}
                    stroke="#4A515C"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                );
              })}
              {Array.from({ length: count / 5 + 1 }).map((_, i) => (
                <SvgText key={i} x={1 + i * 5 * STEP} y={44} fill={colors.textDone} fontSize={10} textAnchor="middle">
                  {String(MIN + i * 5)}
                </SvgText>
              ))}
            </Svg>
          </ScrollView>
        ) : null}
        <View pointerEvents="none" style={[styles.needle, { left: width / 2 - 2 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  value: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  unit: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  track: { height: 46, overflow: 'hidden' },
  needle: { position: 'absolute', top: 0, width: 4, height: 32, borderRadius: 99, backgroundColor: colors.accent },
});
