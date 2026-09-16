import { Platform } from 'react-native'

// Dark-first visual system. Amber ("active") is reserved for the in-progress
// session, the running-session indicator and focused numeric fields; primary
// actions are off-white on dark; destructive and success are text-weight only.
export const colors = {
  // Surface levels, darkest to lightest.
  sessionBar: '#0A0C0E',
  background: '#0F1215',
  strip: '#14181D',
  surface: '#171B20',
  elevated: '#1F242B',
  raised: '#262C34',
  selected: '#2E353E',

  textPrimary: '#EDF0F3',
  textSecondary: '#A2ACB8',
  textMuted: '#7D8794',
  textPlaceholder: '#5A636D',
  textEmpty: '#4A525C',

  border: '#2B323A',
  borderStrong: '#3A424C',
  divider: '#1E242B',

  active: '#E08A28',
  activeText: '#F5B25E',
  activeSurface: '#241B10',
  activeBorder: '#4A3A22',
  activeMeta: '#B49A78',
  activeFocusFill: '#23282F',
  onActive: '#1A1206',

  primary: '#E8ECF1',
  onPrimary: '#0F1215',

  destructive: '#E5645B',
  destructiveBorder: '#4A2C29',
  success: '#4FB286',

  disabledFill: '#22272E',
  disabledText: '#5A636D',

  /** Cool steel rule marking reference data, such as the previous result. */
  referenceRule: '#4E6274',
  overlay: 'rgba(0,0,0,0.6)',
} as const

// 4pt rhythm.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const

/** Horizontal screen padding. */
export const gutter = spacing.xl

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  sheet: 18,
} as const

export const fontSize = {
  label: 11,
  meta: 13,
  body: 15,
  input: 16,
  data: 16,
  dataInput: 17,
  headerTitle: 17,
  cardTitle: 16.5,
  exerciseTitle: 24,
  screenTitle: 28,
  tab: 11.5,
} as const

/** Weights, reps, dates and timers use a monospace face with tabular figures. */
export const fonts = {
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const

export const labelText = {
  fontSize: fontSize.label,
  fontWeight: '700',
  letterSpacing: 1.3,
  textTransform: 'uppercase',
} as const
