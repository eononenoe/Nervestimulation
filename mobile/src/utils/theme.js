import { DefaultTheme } from 'react-native-paper';
import { Platform } from 'react-native';

// Wellsafer 색상 팔레트 (wellsafer_app.html 기준)
export const colors = {
  // Primary Colors
  primary: '#257E53',
  primaryDark: '#1a5c3a',
  accent: '#43E396',

  // Background
  background: '#F2F9F5',
  surface: '#FFFFFF',

  // Status Colors
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  info: '#3b82f6',

  // Grey Scale
  grey: '#6b7280',
  greyLight: '#9ca3af',
  greyDark: '#374151',

  // Text Colors
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#888888',

  // Border
  border: '#e5e7eb',
  borderLight: '#f3f4f6',

  // Special
  online: '#10b981',
  offline: '#9ca3af',
};

// React Native Paper 테마 커스터마이징
export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    accent: colors.accent,
    background: colors.background,
    surface: colors.surface,
    error: colors.danger,
    text: colors.text,
    onSurface: colors.text,
    disabled: colors.greyLight,
    placeholder: colors.textLight,
    backdrop: 'rgba(0, 0, 0, 0.4)',
  },
  roundness: 12,
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: Platform.select({
        ios: 'System',
        android: 'sans-serif',
        default: 'System',
      }),
      fontWeight: 400,
    },
    medium: {
      fontFamily: Platform.select({
        ios: 'System',
        android: 'sans-serif-medium',
        default: 'System',
      }),
      fontWeight: 500,
    },
    light: {
      fontFamily: Platform.select({
        ios: 'System',
        android: 'sans-serif-light',
        default: 'System',
      }),
      fontWeight: 300,
    },
    thin: {
      fontFamily: Platform.select({
        ios: 'System',
        android: 'sans-serif-thin',
        default: 'System',
      }),
      fontWeight: 100,
    },
  },
};

// 섀도우 스타일 (iOS/Android 호환)
export const shadow = {
  small: Platform.select({
    ios: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
  }),
  medium: Platform.select({
    ios: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
  }),
  large: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
  }),
};

// 그라데이션 색상
export const gradients = {
  primary: [colors.primary, colors.primaryDark],
  green: ['#66bd34', '#52a028'],
  darkGreen: [colors.primary, colors.primaryDark],
  orange: ['#f59e0b', '#d97706'],
  red: ['#ef4444', '#dc2626'],
  blue: ['#3b82f6', '#2563eb'],
  purple: ['#8b5cf6', '#7c3aed'],
};

export default {
  colors,
  theme,
  shadow,
  gradients,
};
