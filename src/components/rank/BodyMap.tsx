import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { colors, fonts } from '@/theme';

export const RECOVERY_COLORS = {
  rest: '#FF6B5A',
  recovering: colors.carbs,
  ready: colors.accent,
} as const;

export type RecoveryStatus = keyof typeof RECOVERY_COLORS;

export function recoveryStatus(pct: number): RecoveryStatus {
  if (pct >= 100) return 'ready';
  if (pct < 50) return 'rest';
  return 'recovering';
}

// Recuperação (0–100) por grupo muscular; grupos ausentes estão prontos.
type Recovery = Record<string, number>;

function fill(rec: Recovery, groups: string[]) {
  const pct = Math.min(100, ...groups.map((g) => rec[g] ?? 100));
  return RECOVERY_COLORS[recoveryStatus(pct)];
}

const HEAD = colors.divider;
const LINE = colors.bg;

export function BodyMap({ recovery, width = 150 }: { recovery: Recovery; width?: number }) {
  const height = (width * 210) / 120;
  const f = (...g: string[]) => fill(recovery, g);
  return (
    <View style={styles.grid}>
      <View style={styles.col}>
        <Svg width={width} height={height} viewBox="0 0 120 210" accessibilityLabel="Corpo, vista de frente">
          <Circle cx={60} cy={16} r={11} fill={HEAD} />
          <Rect x={55} y={26} width={10} height={8} fill={HEAD} />
          <Ellipse cx={35} cy={44} rx={9} ry={8} fill={f('Ombros')} />
          <Ellipse cx={85} cy={44} rx={9} ry={8} fill={f('Ombros')} />
          <Path d="M41 37 h18 v23 h-14 q-6 -4 -4 -23z" fill={f('Peito')} />
          <Path d="M61 37 h18 q2 19 -4 23 h-14z" fill={f('Peito')} />
          <Ellipse cx={29} cy={64} rx={6} ry={11} fill={f('Bíceps')} />
          <Ellipse cx={91} cy={64} rx={6} ry={11} fill={f('Bíceps')} />
          <Ellipse cx={25} cy={90} rx={5} ry={12} fill={f('Antebraços')} opacity={0.7} />
          <Ellipse cx={95} cy={90} rx={5} ry={12} fill={f('Antebraços')} opacity={0.7} />
          <Rect x={47} y={63} width={26} height={34} rx={6} fill={f('Abdômen')} />
          <Path d="M45 104 h13 v48 q-4 6 -9 0 q-6 -20 -4 -48z" fill={f('Quadríceps', 'Adutores')} />
          <Path d="M62 104 h13 q2 28 -4 48 q-5 6 -9 0z" fill={f('Quadríceps', 'Adutores')} />
          <Ellipse cx={51} cy={178} rx={6} ry={17} fill={f('Panturrilhas')} />
          <Ellipse cx={69} cy={178} rx={6} ry={17} fill={f('Panturrilhas')} />
          <G stroke={LINE} strokeWidth={1.2} opacity={0.5}>
            <Line x1={60} y1={66} x2={60} y2={96} />
            <Line x1={47} y1={75} x2={73} y2={75} />
            <Line x1={47} y1={86} x2={73} y2={86} />
          </G>
        </Svg>
        <Text style={styles.caption}>FRENTE</Text>
      </View>
      <View style={styles.col}>
        <Svg width={width} height={height} viewBox="0 0 120 210" accessibilityLabel="Corpo, vista de costas">
          <Circle cx={60} cy={16} r={11} fill={HEAD} />
          <Rect x={55} y={26} width={10} height={6} fill={HEAD} />
          <Path d="M48 31 l12 -4 l12 4 l7 9 h-38z" fill={f('Trapézio', 'Pescoço')} />
          <Ellipse cx={35} cy={45} rx={9} ry={8} fill={f('Ombros')} />
          <Ellipse cx={85} cy={45} rx={9} ry={8} fill={f('Ombros')} />
          <Path d="M41 43 h18 v33 q-10 0 -16 -11 q-4 -11 -2 -22z" fill={f('Costas', 'Dorsais')} />
          <Path d="M61 43 h18 q2 11 -2 22 q-6 11 -16 11z" fill={f('Costas', 'Dorsais')} />
          <Ellipse cx={29} cy={64} rx={6} ry={11} fill={f('Tríceps')} />
          <Ellipse cx={91} cy={64} rx={6} ry={11} fill={f('Tríceps')} />
          <Ellipse cx={25} cy={90} rx={5} ry={12} fill={f('Antebraços')} opacity={0.7} />
          <Ellipse cx={95} cy={90} rx={5} ry={12} fill={f('Antebraços')} opacity={0.7} />
          <Rect x={50} y={79} width={20} height={17} rx={5} fill={f('Lombar')} opacity={0.85} />
          <Ellipse cx={51} cy={108} rx={10} ry={10} fill={f('Glúteos', 'Abdutores')} />
          <Ellipse cx={69} cy={108} rx={10} ry={10} fill={f('Glúteos', 'Abdutores')} />
          <Path d="M44 120 h14 v36 q-4 6 -9 0 q-6 -16 -5 -36z" fill={f('Posteriores de coxa')} />
          <Path d="M62 120 h14 q1 20 -5 36 q-5 6 -9 0z" fill={f('Posteriores de coxa')} />
          <Ellipse cx={51} cy={178} rx={7} ry={17} fill={f('Panturrilhas')} />
          <Ellipse cx={69} cy={178} rx={7} ry={17} fill={f('Panturrilhas')} />
          <Line x1={60} y1={44} x2={60} y2={96} stroke={LINE} strokeWidth={1.2} opacity={0.5} />
        </Svg>
        <Text style={styles.caption}>COSTAS</Text>
      </View>
      <View style={styles.legend}>
        <LegendItem color={RECOVERY_COLORS.rest} label="Descansando" />
        <LegendItem color={RECOVERY_COLORS.recovering} label="Recuperando" />
        <LegendItem color={RECOVERY_COLORS.ready} label="Pronto" />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 8,
    paddingTop: 14,
    paddingHorizontal: 10,
    paddingBottom: 12,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  col: { alignItems: 'center', gap: 4 },
  caption: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.9, color: colors.textMuted },
  legend: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 14, paddingTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontFamily: fonts.bold, fontSize: 11, color: colors.textSoft },
});
