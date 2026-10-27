import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import type { StrengthRank } from '@/api/types';
import { colors, fonts, radius, spacing, type } from '@/theme';
import { RANKS } from '@/utils/ranks';
import { Icon, type IconName } from './Icon';

// ---------- Texto ----------

type TextVariant = keyof typeof type;

export function T({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
}: {
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[type[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

// ---------- Tela ----------

interface ScreenProps {
  children: ReactNode;
  // Rola o conteúdo (padrão). Desligue para listas com FlatList.
  scroll?: boolean;
  // Espaço para a barra inferior das abas.
  withTabBar?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  // Elemento fixo sobre o conteúdo (ex: botão flutuante ou rodapé).
  overlay?: ReactNode;
  // Rodapé fixo (ex: botão "Salvar").
  footer?: ReactNode;
  glow?: 'topRight' | 'topLeft' | 'none';
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  withTabBar = false,
  refreshing,
  onRefresh,
  overlay,
  footer,
  glow = 'topRight',
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottom = (withTabBar ? 110 : footer ? 24 : 40) + (withTabBar ? 0 : insets.bottom);
  const content = [styles.content, { paddingTop: insets.top + 16, paddingBottom: bottom }, contentStyle];
  return (
    <View style={styles.screen}>
      {glow !== 'none' && <View pointerEvents="none" style={[styles.glow, glow === 'topLeft' ? styles.glowLeft : null]} />}
      {scroll ? (
        <ScrollView
          contentContainerStyle={content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[content, { flex: 1, paddingBottom: 0 }]}>{children}</View>
      )}
      {footer && <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>{footer}</View>}
      {overlay}
    </View>
  );
}

// Cabeçalho com voltar, título e ação à direita.
export function Header({
  title,
  subtitle,
  right,
  onBack,
  back = true,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  back?: boolean;
}) {
  return (
    <View style={styles.header}>
      {back && <IconButton icon="back" label="Voltar" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />}
      <View style={{ flex: 1, alignItems: back ? 'center' : 'flex-start' }}>
        {subtitle ? <T variant="caption" style={{ fontFamily: fonts.semibold }}>{subtitle}</T> : null}
        <T variant={back ? 'section' : 'title'} numberOfLines={1} style={back ? { fontSize: 17 } : null}>
          {title}
        </T>
      </View>
      {right ?? (back ? <View style={{ width: 44 }} /> : null)}
    </View>
  );
}

// Cabeçalho grande das abas: sobretítulo + título.
export function PageTitle({ overline, title, right }: { overline?: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.pageTitle}>
      <View style={{ flex: 1, gap: 4 }}>
        {overline ? <T variant="label" color={colors.textMuted}>{overline}</T> : null}
        <T variant="title">{title}</T>
      </View>
      {right}
    </View>
  );
}

export function Section({ title, action, onAction, children, style }: { title?: string; action?: string; onAction?: () => void; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 10 }, style]}>
      {title ? (
        <View style={styles.sectionHead}>
          <T variant="section">{title}</T>
          {action ? (
            <Pressable onPress={onAction} hitSlop={10} style={{ paddingVertical: 8 }} accessibilityRole="button">
              <T variant="label" color={colors.accent} style={{ fontFamily: fonts.bold }}>{action}</T>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// ---------- Botões ----------

type ButtonVariant = 'primary' | 'secondary' | 'dashed' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const v = buttonVariants[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        v.container,
        { opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} color={v.text.color} strokeWidth={2} /> : null}
          <Text style={[styles.buttonText, small && { fontSize: 14 }, v.text]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { container: ViewStyle; text: TextStyle & { color: string } }> = {
  primary: { container: { backgroundColor: colors.accent }, text: { color: colors.onAccent, fontFamily: fonts.extrabold, fontSize: 16 } },
  secondary: { container: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderInput }, text: { color: colors.text } },
  dashed: { container: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderDashed }, text: { color: colors.text } },
  danger: { container: { borderWidth: 1, borderColor: colors.dangerBorder }, text: { color: colors.danger } },
  ghost: { container: {}, text: { color: colors.accent } },
};

export function IconButton({
  icon,
  label,
  onPress,
  color = colors.text,
  size = 44,
  style,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, { width: size, height: size, opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Icon name={icon} size={20} color={color} strokeWidth={2} />
    </Pressable>
  );
}

// Botão flutuante ("Nova tarefa") acima da barra de abas.
export function Fab({ title, icon = 'plus', onPress, bottom = 100 }: { title: string; icon?: IconName; onPress: () => void; bottom?: number }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.fab, { bottom, opacity: pressed ? 0.9 : 1 }]}>
      <Icon name={icon} size={20} color={colors.onAccent} strokeWidth={2.2} />
      <Text style={styles.fabText}>{title}</Text>
    </Pressable>
  );
}

// ---------- Campos ----------

export function Field({
  label,
  error,
  hint,
  style,
  right,
  ...input
}: TextInputProps & { label?: string; error?: string | null; hint?: string; right?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 8 }, style as StyleProp<ViewStyle>]}>
      {label ? <T variant="label">{label}</T> : null}
      <View
        style={[
          styles.input,
          focused && { borderColor: colors.accent },
          !!error && { borderColor: colors.danger },
        ]}
      >
        <TextInput
          placeholderTextColor={colors.textDone}
          selectionColor={colors.accent}
          {...input}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={styles.inputText}
          accessibilityLabel={label ?? input.accessibilityLabel}
        />
        {right}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert" size={14} color={colors.danger} strokeWidth={2} />
          <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold, flex: 1 }}>{error}</T>
        </View>
      ) : hint ? (
        <T variant="caption">{hint}</T>
      ) : null}
    </View>
  );
}

export function SearchField({ value, onChangeText, placeholder, right }: { value: string; onChangeText: (t: string) => void; placeholder: string; right?: ReactNode }) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={placeholder}
        style={[styles.inputText, { flex: 1 }]}
      />
      {right}
    </View>
  );
}

// ---------- Superfícies ----------

export function Card({ children, style, onPress, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; padded?: boolean }) {
  const base = [styles.card, padded && { padding: 16 }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

// Linha de lista agrupada (ex: menu do perfil).
export function ListRow({
  icon,
  iconColor = colors.text,
  title,
  subtitle,
  value,
  onPress,
  danger,
  last,
  right,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
  right?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, !last && styles.listRowBorder, pressed && { backgroundColor: colors.surface2 }]}
    >
      {icon ? <Icon name={icon} size={22} color={danger ? colors.danger : iconColor} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontFamily: danger ? fonts.bold : fonts.semibold }} color={danger ? colors.danger : undefined}>{title}</T>
        {subtitle ? <T variant="caption">{subtitle}</T> : null}
      </View>
      {value ? <T variant="label" color={colors.textMuted}>{value}</T> : null}
      {right ?? (onPress && !danger ? <Icon name="chevronRight" size={18} color={colors.textMuted} /> : null)}
    </Pressable>
  );
}

// ---------- Chips e etiquetas ----------

export function Chip({ label, active, onPress, tone = 'neutral' }: { label: string; active?: boolean; onPress?: () => void; tone?: 'neutral' | 'accent' }) {
  const activeStyle =
    tone === 'accent'
      ? { backgroundColor: colors.accentSoft, borderColor: colors.accent }
      : { backgroundColor: colors.text, borderColor: colors.text };
  const activeText = tone === 'accent' ? colors.accent : colors.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={[styles.chip, active && activeStyle]}
    >
      <Text style={[styles.chipText, active && { color: activeText, fontFamily: fonts.bold }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }} style={{ marginRight: -20, flexGrow: 0 }}>
      {children}
    </ScrollView>
  );
}

type TagTone = 'accent' | 'info' | 'warn' | 'pink' | 'neutral' | 'danger' | 'done';

const tagTones: Record<TagTone, { bg: string; fg: string }> = {
  accent: { bg: colors.accentSoft, fg: colors.accent },
  info: { bg: colors.proteinSoft, fg: colors.protein },
  warn: { bg: colors.carbsSoft, fg: colors.carbs },
  pink: { bg: colors.fatSoft, fg: colors.fat },
  neutral: { bg: colors.surface2, fg: colors.textSoft },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  done: { bg: colors.surface2, fg: colors.textDone },
};

export function Tag({ label, tone = 'neutral', strong }: { label: string; tone?: TagTone; strong?: boolean }) {
  const t = tagTones[tone];
  if (strong) {
    return (
      <View style={[styles.tag, { backgroundColor: colors.accent, paddingHorizontal: 11, paddingVertical: 5 }]}>
        <Text style={[styles.tagText, { color: colors.onAccent, fontSize: 12 }]}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      <Text style={[styles.tagText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

// ---------- Progresso ----------

export function ProgressBar({ value, color = colors.accent, height = 8, track = colors.border }: { value: number; color?: string; height?: number; track?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ height, borderRadius: 99, backgroundColor: track, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <View style={{ width: `${pct}%`, height, borderRadius: 99, backgroundColor: color }} />
    </View>
  );
}

// Anel de progresso com conteúdo no centro (nível, calorias...).
export function Ring({
  value,
  size = 92,
  stroke = 8,
  color = colors.accent,
  track = colors.border,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {pct > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
    </View>
  );
}

// Barra de macros dividida (proteína / carboidratos / gordura).
export function MacroBar({ protein, carbs, fat, height = 10 }: { protein: number; carbs: number; fat: number; height?: number }) {
  const total = protein + carbs + fat;
  if (!total) return <View style={{ height, borderRadius: 99, backgroundColor: colors.border }} />;
  return (
    <View style={{ flexDirection: 'row', height, borderRadius: 99, overflow: 'hidden', gap: 2 }}>
      <View style={{ flex: protein, backgroundColor: colors.protein }} />
      <View style={{ flex: carbs, backgroundColor: colors.carbs }} />
      <View style={{ flex: fat, backgroundColor: colors.fat }} />
    </View>
  );
}

// ---------- Selo de rank ----------

export function RankBadge({ rank, size = 64, locked }: { rank: StrengthRank | null | undefined; size?: number; locked?: boolean }) {
  const isLocked = locked || !rank;
  const info = RANKS[rank ?? 'BRONZE'];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={isLocked ? 'Rank bloqueado' : `Rank ${info.label}`}>
      <Image source={info.image} style={{ width: size, height: size, opacity: isLocked ? 0.25 : 1 }} resizeMode="contain" />
      {isLocked && (
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="lock" size={size * 0.42} color={colors.textSoft} strokeWidth={2.2} />
          </View>
        </View>
      )}
    </View>
  );
}

// ---------- Avatar ----------

export function Avatar({ name, uri, size = 48, onPress }: { name: string; uri?: string | null; size?: number; onPress?: () => void }) {
  const initialsText = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i, arr) => (i === 0 || i === arr.length - 1 ? p[0] : ''))
    .join('')
    .toUpperCase();
  const inner = uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 3 }} />
  ) : (
    <Text style={{ fontFamily: fonts.title, fontSize: size * 0.3, color: colors.text }}>{initialsText || '?'}</Text>
  );
  const box = [styles.avatar, { width: size, height: size, borderRadius: size / 3 }];
  if (!onPress) return <View style={box}>{inner}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Perfil" onPress={onPress} style={box}>
      {inner}
    </Pressable>
  );
}

// ---------- Estados ----------

export function EmptyState({ icon = 'tasks', title, message, action, onAction }: { icon?: IconName; title: string; message?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={26} color={colors.accent} />
      </View>
      <T style={{ fontFamily: fonts.bold, fontSize: 16, textAlign: 'center' }}>{title}</T>
      {message ? <T variant="caption" style={{ fontSize: 13, lineHeight: 20, textAlign: 'center' }}>{message}</T> : null}
      {action ? <Button title={action} onPress={onAction} small style={{ marginTop: 4, height: 44, paddingHorizontal: 18 }} /> : null}
    </View>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: 10 }} accessibilityLabel="Carregando" accessibilityState={{ busy: true }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.card, { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
          <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: colors.divider }} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ width: `${60 + ((i * 15) % 30)}%`, height: 12, borderRadius: 6, backgroundColor: colors.border }} />
            <View style={{ width: '35%', height: 10, borderRadius: 6, backgroundColor: colors.divider }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ErrorBanner({ title = 'Algo deu errado', message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorBanner} accessibilityRole="alert">
      <Icon name="alert" size={22} color={colors.danger} />
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{title}</T>
        <T variant="caption" color="#C4A8A6">{message}</T>
      </View>
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
          <Text style={{ color: colors.danger, fontFamily: fonts.extrabold, fontSize: 12 }}>Tentar de novo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <View style={styles.successBanner} accessibilityRole="alert">
      <Icon name="check" size={20} color={colors.accent} strokeWidth={2.2} />
      <T style={{ fontFamily: fonts.bold, fontSize: 14, flex: 1 }}>{message}</T>
    </View>
  );
}

// Carregando a tela inteira (primeira busca).
export function LoadingView() {
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

// Checkbox no estilo do design (quadrado arredondado com acento).
export function Checkbox({ checked, onPress, label, size = 24 }: { checked: boolean; onPress?: () => void; label: string; size?: number }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={10}
      style={[
        styles.checkbox,
        { width: size, height: size },
        checked && { backgroundColor: colors.accent, borderColor: colors.accent },
      ]}
    >
      {checked ? <Icon name="check" size={size - 8} color={colors.onAccent} strokeWidth={3} /> : null}
    </Pressable>
  );
}

// Interruptor simples no estilo do app.
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={[styles.toggle, value && { backgroundColor: colors.accent }]}
    >
      <View style={[styles.toggleKnob, value && { transform: [{ translateX: 20 }], backgroundColor: colors.onAccent }]} />
    </Pressable>
  );
}

// Estatística pequena (número + legenda).
export function Stat({ value, unit, label, color }: { value: string; unit?: string; label: string; color?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontFamily: fonts.title, fontSize: 18, color: color ?? colors.text }}>
        {value}
        {unit ? <Text style={{ fontSize: 12, color: colors.textMuted }}> {unit}</Text> : null}
      </Text>
      <T variant="caption" style={{ fontSize: 11 }}>{label}</T>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  glow: {
    position: 'absolute',
    top: -160,
    right: -140,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: colors.accent,
    opacity: 0.05,
  },
  glowLeft: { right: undefined, left: -120 },
  content: { paddingHorizontal: spacing.gutter, gap: 18 },
  footer: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  pageTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: {
    height: 56,
    borderRadius: radius.button,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonSmall: { height: 44, borderRadius: radius.icon, paddingHorizontal: 16 },
  buttonText: { fontFamily: fonts.bold, fontSize: 15 },
  iconButton: {
    borderRadius: radius.icon,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    height: 56,
    paddingHorizontal: 22,
    borderRadius: 20,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  fabText: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.onAccent },
  input: {
    minHeight: 54,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputText: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 15, paddingVertical: 14 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  search: {
    height: 52,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  card: { borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 56 },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  chip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSoft },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.chip },
  tagText: { fontFamily: fonts.extrabold, fontSize: 11 },
  avatar: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingLeft: 16,
    borderRadius: 18,
    backgroundColor: '#1A1214',
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  retry: { height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#2A1719', justifyContent: 'center' },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentSoftBorder,
  },
  checkbox: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderDashed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, padding: 4 },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.textSoft },
});
