import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import StatCard from '../components/StatCard';
import AppHeader from '../components/AppHeader';
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const NerveStimScreen = () => {
  // 새 세션 생성 폼 상태
  const [selectedBand, setSelectedBand] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');

  // 모의 밴드 데이터
  const bands = [
    { id: '467191213660619', name: '김태현' },
    { id: '467191213660620', name: '강민준' },
    { id: '467191213660614', name: '윤서연' },
    { id: '467191213660616', name: '이수빈' },
    { id: '467191213660623', name: '박도현' },
  ];

  // 모의 세션 데이터
  const sessions = [
    {
      id: 1,
      bandId: '660619',
      userName: '김태현',
      eHG4S: '연결됨',
      level: 5,
      duration: 25,
      preBP: '142/88',
      postBP: '128/80',
      change: '-14/-8',
      status: '완료',
    },
    {
      id: 2,
      bandId: '660620',
      userName: '강민준',
      eHG4S: '연결됨',
      level: 3,
      duration: 20,
      preBP: '138/85',
      postBP: '125/78',
      change: '-13/-7',
      status: '완료',
    },
    {
      id: 3,
      bandId: '660614',
      userName: '윤서연',
      eHG4S: '미연결',
      level: 4,
      duration: 15,
      preBP: '145/90',
      postBP: '-',
      change: '-',
      status: '진행중',
    },
    {
      id: 4,
      bandId: '660616',
      userName: '이수빈',
      eHG4S: '연결됨',
      level: 6,
      duration: 30,
      preBP: '150/92',
      postBP: '135/83',
      change: '-15/-9',
      status: '완료',
    },
    {
      id: 5,
      bandId: '660623',
      userName: '박도현',
      eHG4S: '연결됨',
      level: 2,
      duration: 15,
      preBP: '132/82',
      postBP: '-',
      change: '-',
      status: '대기',
    },
  ];

  const completedCount = sessions.filter(s => s.status === '완료').length;
  const inProgressCount = sessions.filter(s => s.status === '진행중').length;
  const completedSessions = sessions.filter(s => s.status === '완료' && s.change !== '-');
  const avgChange = completedSessions.length > 0
    ? (completedSessions.reduce((acc, s) => acc + parseInt(s.change.split('/')[0]), 0) / completedSessions.length).toFixed(1)
    : '0.0';

  const createSession = () => {
    if (!selectedBand || !selectedLevel || !selectedDuration) {
      alert('모든 항목을 선택해주세요');
      return;
    }
    alert('세션이 생성되었습니다');
    setSelectedBand('');
    setSelectedLevel('');
    setSelectedDuration('');
  };

  const getStatusChip = (status) => {
    if (status === '완료') {
      return <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}><Text style={styles.statusText}>완료</Text></View>;
    } else if (status === '진행중') {
      return <View style={[styles.statusBadge, { backgroundColor: '#2196F3' }]}><Text style={styles.statusText}>진행중</Text></View>;
    }
    return <View style={[styles.statusBadge, { backgroundColor: '#9E9E9E' }]}><Text style={styles.statusText}>대기</Text></View>;
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>신경자극 관리</Text>

        {/* 통계 카드 */}
        <View style={styles.statsGrid}>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="flash"
              value={sessions.length}
              label="전체 세션"
              color="darkGreen"
            />
          </View>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="check-circle"
              value={completedCount}
              label="완료"
              color="darkGreen"
            />
          </View>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="timer"
              value={inProgressCount}
              label="진행 중"
              color="darkGreen"
            />
          </View>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="heart-pulse"
              value={avgChange}
              label="평균 혈압변화"
              color="darkGreen"
            />
          </View>
        </View>

        {/* 새 세션 생성 */}
        <Text style={styles.sectionTitle}>새 세션 생성</Text>
        <View style={[styles.card, shadow.small]}>
          <View style={styles.formRow}>
            <View style={styles.formItem}>
              <Text style={styles.formLabel}>밴드 선택</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedBand}
                  onValueChange={setSelectedBand}
                  style={styles.picker}
                >
                  <Picker.Item label="밴드 선택" value="" />
                  {bands.map(band => (
                    <Picker.Item
                      key={band.id}
                      label={`${band.name} (${band.id.slice(-4)})`}
                      value={band.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.formItem}>
              <Text style={styles.formLabel}>단계 선택</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedLevel}
                  onValueChange={setSelectedLevel}
                  style={styles.picker}
                >
                  <Picker.Item label="단계 선택" value="" />
                  {[1, 2, 3, 4, 5, 6, 7].map(level => (
                    <Picker.Item
                      key={level}
                      label={`단계 ${level}`}
                      value={level.toString()}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.formItem}>
              <Text style={styles.formLabel}>시간 선택</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedDuration}
                  onValueChange={setSelectedDuration}
                  style={styles.picker}
                >
                  <Picker.Item label="시간 선택" value="" />
                  {[15, 20, 25, 30].map(duration => (
                    <Picker.Item
                      key={duration}
                      label={`${duration}분`}
                      value={duration.toString()}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity style={styles.createButton} onPress={createSession}>
              <Text style={styles.createButtonText}>세션 생성</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 세션 목록 */}
        <Text style={styles.sectionTitle}>세션 목록</Text>
        <View style={[styles.card, shadow.small]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* 테이블 헤더 */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colBandId]}>밴드</Text>
                <Text style={[styles.tableHeaderText, styles.colUser]}>사용자</Text>
                <Text style={[styles.tableHeaderText, styles.colEHG]}>eHG4S</Text>
                <Text style={[styles.tableHeaderText, styles.colLevel]}>단계</Text>
                <Text style={[styles.tableHeaderText, styles.colDuration]}>시간</Text>
                <Text style={[styles.tableHeaderText, styles.colBP]}>혈압(전)</Text>
                <Text style={[styles.tableHeaderText, styles.colBP]}>혈압(후)</Text>
                <Text style={[styles.tableHeaderText, styles.colChange]}>변화</Text>
                <Text style={[styles.tableHeaderText, styles.colStatus]}>상태</Text>
              </View>

              {/* 테이블 데이터 */}
              {sessions.map((session, index) => (
                <View
                  key={session.id}
                  style={[styles.tableRow, index < sessions.length - 1 && styles.tableBorder]}
                >
                  <Text style={[styles.tableCell, styles.colBandId]}>{session.bandId}</Text>
                  <Text style={[styles.tableCell, styles.colUser, styles.tableCellBold]}>{session.userName}</Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.colEHG,
                      session.eHG4S === '연결됨' ? styles.textGreen : styles.textRed,
                    ]}
                  >
                    {session.eHG4S}
                  </Text>
                  <Text style={[styles.tableCell, styles.colLevel]}>{session.level}</Text>
                  <Text style={[styles.tableCell, styles.colDuration]}>{session.duration}분</Text>
                  <Text style={[styles.tableCell, styles.colBP]}>{session.preBP}</Text>
                  <Text style={[styles.tableCell, styles.colBP]}>{session.postBP}</Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.colChange,
                      session.change !== '-' && styles.textGreen,
                      session.change !== '-' && styles.tableCellBold,
                    ]}
                  >
                    {session.change}
                  </Text>
                  <View style={[styles.tableCell, styles.colStatus]}>
                    {getStatusChip(session.status)}
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
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  formItem: {
    flex: 1,
    minWidth: '30%',
  },
  formLabel: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scaleSize(8),
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  picker: {
    height: scaleSize(44),
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: scaleSize(12),
    borderRadius: scaleSize(8),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    minWidth: scaleSize(100),
  },
  createButtonText: {
    color: 'white',
    fontSize: scaleFontSize(13),
    fontWeight: '600',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: scaleSize(10),
    paddingHorizontal: scaleSize(8),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableHeaderText: {
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
  tableCell: {
    fontSize: scaleFontSize(11),
    color: colors.text,
    textAlign: 'center',
  },
  tableCellBold: {
    fontWeight: '500',
  },
  colBandId: {
    width: scaleSize(65),
  },
  colUser: {
    width: scaleSize(60),
  },
  colEHG: {
    width: scaleSize(60),
  },
  colLevel: {
    width: scaleSize(40),
  },
  colDuration: {
    width: scaleSize(50),
  },
  colBP: {
    width: scaleSize(70),
  },
  colChange: {
    width: scaleSize(70),
  },
  colStatus: {
    width: scaleSize(70),
    alignItems: 'center',
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

export default NerveStimScreen;
