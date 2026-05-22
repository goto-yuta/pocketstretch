import { Platform } from 'react-native';

export const Colors = {
  primary:       '#E8874A',
  primaryDeep:   '#D4614A',
  primaryLight:  '#FFE5CC',
  bgMain:        '#FFF8F2',
  bgCard:        '#FFFFFF',
  bgAccent:      '#FDF0E6',
  textPrimary:   '#3D1F0A',
  textSecondary: '#8B6555',
  textMuted:     '#C8A898',
  border:        '#F0DDD4',
} as const;

export const Radius = {
  sm:   8,
  md:   14,
  lg:   18,
  full: 999,
} as const;

export const Shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#E8874A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
    },
    android: { elevation: 3 },
    default: {},
  })!,
  button: Platform.select({
    ios: {
      shadowColor: '#E8874A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
    },
    android: { elevation: 6 },
    default: {},
  })!,
} as const;
