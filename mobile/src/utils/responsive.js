import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 기준 디바이스 크기 (iPhone 8)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 667;

/**
 * 화면 너비 기준으로 크기 조정
 * @param {number} size - 기준 크기
 * @returns {number} - 조정된 크기
 */
export const scaleSize = (size) => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * 화면 높이 기준으로 크기 조정
 * @param {number} size - 기준 크기
 * @returns {number} - 조정된 크기
 */
export const scaleHeight = (size) => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * 폰트 크기 자동 조정
 * @param {number} size - 기준 폰트 크기
 * @returns {number} - 조정된 폰트 크기
 */
export const scaleFontSize = (size) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;

  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

/**
 * 디바이스 타입 감지
 * @returns {string} - 'phone' 또는 'tablet'
 */
export const getDeviceType = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;

  if (aspectRatio < 1.6 || SCREEN_WIDTH > 600) {
    return 'tablet';
  }
  return 'phone';
};

/**
 * 디바이스가 작은 화면인지 확인
 * @returns {boolean}
 */
export const isSmallDevice = () => {
  return SCREEN_WIDTH < 375;
};

/**
 * 디바이스가 큰 화면인지 확인
 * @returns {boolean}
 */
export const isLargeDevice = () => {
  return SCREEN_WIDTH > 414;
};

/**
 * 현재 화면 크기
 */
export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;

/**
 * 간격(spacing) 스케일링
 */
export const spacing = {
  xs: scaleSize(4),
  sm: scaleSize(8),
  md: scaleSize(12),
  lg: scaleSize(16),
  xl: scaleSize(24),
  xxl: scaleSize(32),
};

export default {
  scaleSize,
  scaleHeight,
  scaleFontSize,
  getDeviceType,
  isSmallDevice,
  isLargeDevice,
  screenWidth,
  screenHeight,
  spacing,
};
