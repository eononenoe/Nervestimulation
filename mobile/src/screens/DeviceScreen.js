import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import StatCard from '../components/StatCard';
import AppHeader from '../components/AppHeader';
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const DeviceScreen = () => {
  // 모의 데이터 - 스마트밴드
  const bands = [
    {
      id: '467191213660619',
      user: '김태현',
      firmware: 'v2.1.3',
      battery: 85,
      eHG4S: '연결됨',
      status: '정상',
    },
    {
      id: '467191213660620',
      user: '강민준',
      firmware: 'v2.0.8',
      battery: 62,
      eHG4S: '연결됨',
      status: '정상',
    },
    {
      id: '467191213660614',
      user: '윤서연',
      firmware: 'v2.1.3',
      battery: 45,
      eHG4S: '미연결',
      status: '주의',
    },
    {
      id: '467191213660616',
      user: '이수빈',
      firmware: 'v2.2.1',
      battery: 92,
      eHG4S: '연결됨',
      status: '정상',
    },
    {
      id: '467191213660623',
      user: '박도현',
      firmware: 'v2.1.3',
      battery: 15,
      eHG4S: '연결됨',
      status: '오프라인',
    },
  ];

  const getStatusColor = (status) => {
    if (status === '정상') return colors.primary;
    if (status === '주의') return '#FF9800';
    if (status === '위험') return '#E53935';
    return '#9E9E9E'; // 오프라인
  };

  const getStatusBadge = (status) => {
    return (
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    );
  };

  const getBatteryColor = (battery) => {
    if (battery <= 20) return colors.danger;
    if (battery <= 50) return colors.warning;
    return colors.success;
  };

  const normalCount = bands.filter(b => b.status === '정상').length;
  const warningCount = bands.filter(b => b.status === '주의').length;
  const offlineCount = bands.filter(b => b.status === '오프라인').length;

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>기기 관리</Text>

        {/* 통계 카드 */}
        <View style={styles.statsGrid}>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="devices"
              value={bands.length}
              label="전체 기기"
              color="darkGreen"
            />
          </View>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="check-circle"
              value={normalCount}
              label="정상"
              color="darkGreen"
            />
          </View>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="alert"
              value={warningCount}
              label="주의"
              color="orange"
            />
          </View>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="wifi-off"
              value={offlineCount}
              label="오프라인"
              color="red"
            />
          </View>
        </View>

        {/* 기기 목록 */}
        <Text style={styles.sectionTitle}>기기 목록</Text>
        <View style={[styles.card, shadow.small]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* 테이블 헤더 */}
              <View style={styles.tableHeader}>
                <Text style={[styles.headerText, styles.colBandId]}>밴드 ID</Text>
                <Text style={[styles.headerText, styles.colUser]}>사용자</Text>
                <Text style={[styles.headerText, styles.colFirmware]}>펌웨어</Text>
                <Text style={[styles.headerText, styles.colBattery]}>배터리</Text>
                <Text style={[styles.headerText, styles.colEHG]}>eHG4S</Text>
                <Text style={[styles.headerText, styles.colStatus]}>상태</Text>
              </View>

              {/* 테이블 데이터 */}
              {bands.map((band, index) => (
                <View
                  key={band.id}
                  style={[styles.tableRow, index < bands.length - 1 && styles.tableBorder]}
                >
                  <Text style={[styles.cellText, styles.colBandId]}>{band.id}</Text>
                  <Text style={[styles.cellText, styles.cellTextBold, styles.colUser]}>{band.user}</Text>
                  <Text style={[styles.cellText, styles.colFirmware]}>{band.firmware}</Text>
                  <Text
                    style={[
                      styles.cellText,
                      styles.colBattery,
                      { color: getBatteryColor(band.battery) },
                      band.battery < 20 && styles.cellTextBold,
                    ]}
                  >
                    {band.battery}%
                  </Text>
                  <Text
                    style={[
                      styles.cellText,
                      styles.colEHG,
                      band.eHG4S === '연결됨' ? styles.textGreen : styles.textRed,
                    ]}
                  >
                    {band.eHG4S}
                  </Text>
                  <View style={[styles.colStatus, { alignItems: 'center' }]}>
                    {getStatusBadge(band.status)}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  screenTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCardWrapper: {
    width: '23.5%',
  },
  sectionTitle: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: scaleSize(14),
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: scaleSize(10),
    paddingHorizontal: scaleSize(8),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: scaleSize(10),
    paddingHorizontal: scaleSize(8),
    alignItems: 'center',
  },
  tableBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cellText: {
    fontSize: scaleFontSize(11),
    color: colors.text,
    textAlign: 'center',
  },
  cellTextBold: {
    fontWeight: '500',
  },
  colBandId: {
    width: scaleSize(130),
  },
  colUser: {
    width: scaleSize(60),
  },
  colFirmware: {
    width: scaleSize(60),
  },
  colBattery: {
    width: scaleSize(60),
  },
  colEHG: {
    width: scaleSize(60),
  },
  colStatus: {
    width: scaleSize(70),
  },
  statusBadge: {
    paddingHorizontal: scaleSize(8),
    paddingVertical: scaleSize(4),
    borderRadius: scaleSize(6),
  },
  statusText: {
    fontSize: scaleFontSize(10),
    fontWeight: '600',
    color: 'white',
  },
  textGreen: {
    color: colors.primary,
  },
  textRed: {
    color: '#E53935',
  },
});

export default DeviceScreen;
