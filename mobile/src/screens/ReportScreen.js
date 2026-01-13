import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AppHeader from '../components/AppHeader';
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const ReportScreen = () => {
  const [selectedUser, setSelectedUser] = useState('467191213660619');
  const [selectedPeriod, setSelectedPeriod] = useState('7');

  // 모의 사용자 데이터
  const users = [
    { id: '467191213660619', name: '김태현' },
    { id: '467191213660620', name: '강민준' },
    { id: '467191213660614', name: '윤서연' },
    { id: '467191213660616', name: '이수빈' },
    { id: '467191213660623', name: '박도현' },
  ];

  // 주간 데이터 (7일)
  const weeklyData = [
    { date: '1/7', sessions: 8 },
    { date: '1/8', sessions: 6 },
    { date: '1/9', sessions: 10 },
    { date: '1/10', sessions: 7 },
    { date: '1/11', sessions: 9 },
    { date: '1/12', sessions: 12 },
    { date: '1/13', sessions: 11 },
  ];

  const maxSessions = Math.max(...weeklyData.map(d => d.sessions));

  const handleGenerateReport = () => {
    const user = users.find(u => u.id === selectedUser);
    Alert.alert('리포트 생성', `${user.name}님의 최근 ${selectedPeriod}일 리포트가 생성되었습니다.`);
  };

  const handleExportPDF = () => {
    Alert.alert('PDF 내보내기', 'PDF 내보내기 준비중...\nPDF가 다운로드 되었습니다.');
  };

  const renderBarChart = () => {
    return (
      <View style={styles.chartContainer}>
        {weeklyData.map((data, index) => {
          const heightPercentage = (data.sessions / maxSessions) * 100;
          return (
            <View key={index} style={styles.barWrapper}>
              <Text style={styles.barValue}>{data.sessions}</Text>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    { height: `${heightPercentage}%` }
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{data.date}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>건강 리포트</Text>

        {/* 필터 및 액션 버튼 */}
        <View style={[styles.card, shadow.small]}>
          <View style={styles.filterRow}>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedUser}
                onValueChange={setSelectedUser}
                style={styles.picker}
              >
                {users.map(user => (
                  <Picker.Item key={user.id} label={user.name} value={user.id} />
                ))}
              </Picker>
            </View>
            <View style={styles.pickerWrapperSmall}>
              <Picker
                selectedValue={selectedPeriod}
                onValueChange={setSelectedPeriod}
                style={styles.picker}
              >
                <Picker.Item label="최근 7일" value="7" />
                <Picker.Item label="최근 14일" value="14" />
                <Picker.Item label="최근 30일" value="30" />
              </Picker>
            </View>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleGenerateReport}
            >
              <Text style={styles.buttonText}>리포트 생성</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleExportPDF}
            >
              <Text style={styles.buttonText}>PDF 내보내기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 생체신호 요약 & 신경자극 효과 */}
        <View style={styles.summaryGrid}>
          <View style={[styles.card, styles.summaryCard, shadow.small]}>
            <Text style={styles.cardTitle}>생체신호 요약</Text>
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>평균 심박수</Text>
                <Text style={styles.summaryValue}>72 BPM</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>평균 SpO2</Text>
                <Text style={styles.summaryValue}>98%</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>평균 혈압</Text>
                <Text style={styles.summaryValue}>125/78 mmHg</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>일일 활동량</Text>
                <Text style={styles.summaryValue}>7,234 걸음</Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, styles.summaryCard, shadow.small]}>
            <Text style={styles.cardTitle}>신경자극 효과</Text>
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>총 세션 수</Text>
                <Text style={styles.summaryValue}>12회</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>평균 자극 시간</Text>
                <Text style={styles.summaryValue}>25분</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>혈압 감소 효과</Text>
                <Text style={[styles.summaryValue, styles.successText]}>-15.2 mmHg</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>효과 지속 시간</Text>
                <Text style={styles.summaryValue}>5.1시간</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 주간 세션 트렌드 */}
        <View style={[styles.card, shadow.small]}>
          <Text style={styles.cardTitle}>주간 세션 트렌드</Text>
          {renderBarChart()}
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
  card: {
    backgroundColor: 'white',
    borderRadius: scaleSize(14),
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  pickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scaleSize(8),
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  pickerWrapperSmall: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scaleSize(8),
    overflow: 'hidden',
    backgroundColor: 'white',
    minWidth: scaleSize(110),
  },
  picker: {
    height: scaleSize(44),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: scaleSize(12),
    borderRadius: scaleSize(8),
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: 'white',
  },
  summaryGrid: {
    flexDirection: 'column',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCard: {
    width: '100%',
  },
  cardTitle: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryContent: {
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: scaleFontSize(13),
    fontWeight: '700',
    color: colors.text,
  },
  successText: {
    color: colors.primary,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: scaleSize(180),
    paddingTop: spacing.lg,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barValue: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: scaleSize(30),
  },
  bar: {
    width: '100%',
    backgroundColor: colors.primary,
    borderTopLeftRadius: scaleSize(6),
    borderTopRightRadius: scaleSize(6),
    minHeight: scaleSize(4),
  },
  barLabel: {
    fontSize: scaleFontSize(11),
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

export default ReportScreen;
