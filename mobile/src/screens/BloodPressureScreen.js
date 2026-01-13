import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import StatCard from '../components/StatCard';
import AppHeader from '../components/AppHeader';
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const BloodPressureScreen = () => {
  // 모의 데이터
  const records = [
    {
      bandId: '660619',
      user: '김태현',
      systolic: 148,
      diastolic: 92,
      pulse: 78,
      type: '자극 전',
      time: '14:30',
    },
    {
      bandId: '660619',
      user: '김태현',
      systolic: 132,
      diastolic: 82,
      pulse: 72,
      type: '자극 후',
      time: '15:00',
    },
    {
      bandId: '660620',
      user: '강민준',
      systolic: 142,
      diastolic: 88,
      pulse: 75,
      type: '자극 전',
      time: '13:20',
    },
    {
      bandId: '660620',
      user: '강민준',
      systolic: 128,
      diastolic: 80,
      pulse: 70,
      type: '자극 후',
      time: '13:45',
    },
    {
      bandId: '660614',
      user: '윤서연',
      systolic: 135,
      diastolic: 85,
      pulse: 73,
      type: '자극 전',
      time: '12:15',
    },
    {
      bandId: '660614',
      user: '윤서연',
      systolic: 122,
      diastolic: 78,
      pulse: 68,
      type: '자극 후',
      time: '12:40',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>혈압 관리</Text>

        {/* 통계 카드 */}
        <View style={styles.statsGrid}>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="heart-pulse"
              value="132"
              label="평균 수축기"
              color="darkGreen"
            />
          </View>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="heart"
              value="83"
              label="평균 이완기"
              color="darkGreen"
            />
          </View>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="trending-down"
              value="-14.7"
              label="자극 후 변화"
              color="darkGreen"
            />
          </View>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="counter"
              value={records.length}
              label="총 측정"
              color="darkGreen"
            />
          </View>
        </View>

        {/* 혈압 추이 그래프 */}
        <View style={[styles.card, shadow.small]}>
          <Text style={styles.cardTitle}>혈압 추이</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels: ['12/16', '12/17', '12/18', '12/19', '12/20', '12/21', '12/22'],
                datasets: [
                  {
                    data: [138, 142, 135, 140, 132, 128, 130],
                    color: (opacity = 1) => `rgba(37, 126, 83, ${opacity})`,
                    strokeWidth: 2,
                  },
                  {
                    data: [88, 90, 85, 88, 82, 80, 82],
                    color: (opacity = 1) => `rgba(67, 227, 150, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
                legend: ['수축기', '이완기'],
              }}
              width={Dimensions.get('window').width - spacing.md * 4}
              height={scaleSize(200)}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(37, 126, 83, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#ffffff',
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        </View>

        {/* 혈압 기록 */}
        <Text style={styles.sectionTitle}>혈압 기록</Text>
        <View style={[styles.card, shadow.small]}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { flex: 1.5 }]}>밴드 ID</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>사용자</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>수축기</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>이완기</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>맥박</Text>
            <Text style={[styles.headerText, { flex: 1.2 }]}>구분</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>시간</Text>
          </View>

          {records.map((record, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.tableRow,
                index < records.length - 1 && styles.tableRowBorder,
              ]}
            >
              <Text style={[styles.cellText, { flex: 1.5 }]}>{record.bandId}</Text>
              <Text style={[styles.cellText, styles.cellTextBold, { flex: 1.5 }]}>{record.user}</Text>
              <Text
                style={[
                  styles.cellText,
                  { flex: 1 },
                  record.type === '자극 후' && styles.successText,
                ]}
              >
                {record.systolic}
              </Text>
              <Text
                style={[
                  styles.cellText,
                  { flex: 1 },
                  record.type === '자극 후' && styles.successText,
                ]}
              >
                {record.diastolic}
              </Text>
              <Text style={[styles.cellText, { flex: 1 }]}>{record.pulse}</Text>
              <View style={{ flex: 1.2, alignItems: 'center' }}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: record.type === '자극 후' ? colors.primary : '#FF9800' },
                  ]}
                >
                  <Text style={styles.typeBadgeText}>{record.type}</Text>
                </View>
              </View>
              <Text style={[styles.cellText, { flex: 1 }]}>{record.time}</Text>
            </TouchableOpacity>
          ))}
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
  card: {
    backgroundColor: 'white',
    borderRadius: scaleSize(14),
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: colors.primary,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  chartContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  chart: {
    marginVertical: spacing.xs,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: spacing.sm,
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
    padding: spacing.sm,
    alignItems: 'center',
  },
  tableRowBorder: {
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
  successText: {
    color: colors.primary,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: scaleSize(8),
    paddingVertical: scaleSize(4),
    borderRadius: scaleSize(6),
  },
  typeBadgeText: {
    fontSize: scaleFontSize(10),
    fontWeight: '600',
    color: 'white',
  },
});

export default BloodPressureScreen;
