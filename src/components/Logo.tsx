import { View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

// Marca do FantesDay: o "F" verde com a faísca laranja (mesmo desenho do ícone do app).
export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Rect x={253} y={313} width={120} height={500} rx={60} fill={colors.accent} />
      <Rect x={253} y={313} width={348} height={120} rx={60} fill={colors.accent} />
      <Rect x={253} y={513} width={268} height={110} rx={55} fill={colors.accent} />
      <Path d="M691 211 Q701 281 771 291 Q701 301 691 371 Q681 301 611 291 Q681 281 691 211 Z" fill={colors.carbs} />
    </Svg>
  );
}

// Ícone do app (fundo escuro com brilho verde e cantos arredondados), para telas como o login.
export function AppIcon({ size = 64 }: { size?: number }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="FantesDay"
      style={{ width: size, height: size, borderRadius: size * 0.28, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}
    >
      <Svg width={size} height={size} viewBox="0 0 1024 1024">
        <Defs>
          <RadialGradient id="fd-glow" cx="50%" cy="46%" r="55%">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.16} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={1024} height={1024} fill={colors.bg} />
        <Rect width={1024} height={1024} fill="url(#fd-glow)" />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0 }}>
        <LogoMark size={size} />
      </View>
    </View>
  );
}
