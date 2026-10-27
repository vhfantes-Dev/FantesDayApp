// Tokens do guia de estilo do FantesDay (tema escuro, base de 4 px).

export const colors = {
  bg: '#0A0C0F',
  bgDeep: '#050608',
  tabBar: '#0D0F13',
  surface: '#13161B',
  surface2: '#1A1E24',
  border: '#242932',
  borderInput: '#2A303A',
  borderDashed: '#3A414C',
  divider: '#1E232A',
  text: '#F1F2F4',
  textLabel: '#B4BAC4',
  textSoft: '#C4C9D1',
  textMuted: '#98A0AC',
  textDone: '#6F7782',
  accent: '#C8F55A',
  accentSoft: '#1C2117',
  accentSoftBorder: '#2E3A1E',
  onAccent: '#0A0C0F',
  danger: '#FF8A7A',
  dangerBorder: '#3A2226',
  dangerSoft: '#2A1618',
  protein: '#7EA6FF',
  proteinSoft: '#161C2A',
  carbs: '#FFA657',
  carbsSoft: '#2A1E14',
  fat: '#F07FB5',
  fatSoft: '#2A1622',
  water: '#5CC8FF',
} as const;

export const fonts = {
  display: 'Unbounded_700Bold',
  title: 'Unbounded_600SemiBold',
  displayMedium: 'Unbounded_500Medium',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const radius = {
  chip: 99,
  input: 16,
  button: 18,
  card: 20,
  cardLg: 24,
  sheet: 28,
  icon: 14,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  gutter: 20,
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -1, color: colors.text },
  title: { fontFamily: fonts.title, fontSize: 26, letterSpacing: -0.5, color: colors.text },
  section: { fontFamily: fonts.title, fontSize: 16, color: colors.text },
  body: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textLabel },
  caption: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  overline: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1, color: colors.textMuted },
} as const;
