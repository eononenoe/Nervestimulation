import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, gradients } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';
import { useSocket } from '../contexts/SocketContext';

const AppHeader = () => {
  const { isConnected } = useSocket();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // 시간 업데이트
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // 날짜 업데이트
    updateDate();

    return () => clearInterval(timer);
  }, []);

  const updateDate = () => {
    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;
    setCurrentDate(dateStr);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('ko-KR', { hour12: false });
  };

  return (
    <LinearGradient colors={gradients.primary} style={styles.header}>
      {/* 로고 */}
      <View style={styles.logoContainer}>
        <MaterialCommunityIcons name="heart-pulse" size={scaleSize(20)} color={colors.accent} />
        <Text style={styles.logoText}>Wellsafer</Text>

        {/* Socket 연결 상태 인디케이터 */}
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? colors.accent : colors.greyLight },
            ]}
          />
          <Text style={styles.statusText}>
            {isConnected ? '실시간' : '오프라인'}
          </Text>
        </View>
      </View>

      {/* 시간 & 날씨 위젯 */}
      <View style={styles.widgetRow}>
        {/* 시간 위젯 */}
        <View style={styles.timeWidget}>
          <Text style={styles.timeDate}>{currentDate}</Text>
          <Text style={styles.timeClock}>{formatTime(currentTime)}</Text>
        </View>

        {/* 날씨 위젯 */}
        <View style={styles.weatherWidget}>
          <Text style={styles.weatherIcon}>☀️</Text>
          <View style={styles.weatherInfo}>
            <Text style={styles.weatherTemp}>-2°C</Text>
            <Text style={styles.weatherDesc}>맑음 | 습도 45%</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    justifyContent: 'space-between',
  },
  logoText: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    color: 'white',
    marginLeft: spacing.sm,
    letterSpacing: -0.5,
  },
  widgetRow: {
    flexDirection: 'row',
    gap: scaleSize(10),
  },
  timeWidget: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: scaleSize(12),
    padding: scaleSize(10),
  },
  timeDate: {
    fontSize: scaleFontSize(10),
    color: 'white',
    opacity: 0.9,
    marginBottom: scaleSize(2),
  },
  timeClock: {
    fontSize: scaleFontSize(22),
    fontWeight: '700',
    color: 'white',
  },
  weatherWidget: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: scaleSize(12),
    padding: scaleSize(10),
    paddingHorizontal: scaleSize(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weatherIcon: {
    fontSize: scaleFontSize(24),
  },
  weatherInfo: {
    justifyContent: 'center',
  },
  weatherTemp: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: 'white',
  },
  weatherDesc: {
    fontSize: scaleFontSize(9),
    color: 'white',
    opacity: 0.85,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: scaleSize(4),
    borderRadius: scaleSize(12),
  },
  statusDot: {
    width: scaleSize(8),
    height: scaleSize(8),
    borderRadius: scaleSize(4),
    marginRight: scaleSize(6),
  },
  statusText: {
    fontSize: scaleFontSize(10),
    color: 'white',
    fontWeight: '500',
  },
});

export default AppHeader;
