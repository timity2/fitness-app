// Дизайн-система Pulse: Premium Dark Fitness
export const colors = {
  bg: '#09090D',
  bg2: '#121219',
  card: '#191923',
  card2: '#22222D',
  pink: '#F04491',
  crimson: '#D92E79',
  pinkLight: '#FF76B4',
  text: '#FFFFFF',
  text2: '#A3A3B2',
  muted: '#666675',
  success: '#37C98B',
  error: '#FF5263',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',
  pinkSoft: 'rgba(240,68,145,0.14)',
} as const;

export const gradient = ['#F04491', '#D92E79'] as const;

export const radius = { sm: 12, md: 16, lg: 20, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  boldItalic: 'Inter_700Bold_Italic',
} as const;

/** Максимальная ширина контента — на планшетах и в вебе экран остаётся «телефонным». */
export const MAX_WIDTH = 520;
