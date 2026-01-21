import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StatCard from '../components/StatCard';
import AppHeader from '../components/AppHeader';
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';
import { nerveStimAPI, bandAPI } from '../services/api';

const NerveStimScreen = () => {
  // 상태 관리
  const [sessions, setSessions] = useState([]);
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 세션 상세 모달
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);

  // 새 세션 생성 폼 상태
  const [selectedBand, setSelectedBand] = useState('');
  const [bandOpen, setBandOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [levelOpen, setLevelOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('');
  const [durationOpen, setDurationOpen] = useState(false);

  // 데이터 로드
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchSessions(), fetchBands()]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await nerveStimAPI.getSessions({ limit: 50 });
      if (response.data && response.data.success) {
        setSessions(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchBands = async () => {
    try {
      const response = await bandAPI.getList();
      console.log('[NerveStim] Bands API response:', response.data);
      if (response.data && response.data.success) {
        const bandsData = response.data.data || [];
        console.log('[NerveStim] Total bands:', bandsData.length);
        // 모든 밴드 표시 (온라인/오프라인 모두)
        setBands(bandsData);
      }
    } catch (error) {
      console.error('Failed to fetch bands:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // 세션 생성
  const createSession = async () => {
    if (!selectedBand || !selectedLevel || !selectedDuration) {
      Alert.alert('알림', '모든 항목을 선택해주세요');
      return;
    }

    try {
      await nerveStimAPI.createSession({
        bid: selectedBand,
        stim_level: parseInt(selectedLevel),
        duration: parseInt(selectedDuration),
        frequency: 10.0,
        pulse_width: 200,
        target_nerve: 'median',
        stim_mode: 'manual'
      });

      Alert.alert('성공', '세션이 생성되었습니다');
      setSelectedBand('');
      setSelectedLevel('');
      setSelectedDuration('');
      fetchSessions();
    } catch (error) {
      console.error('Failed to create session:', error);
      Alert.alert('오류', error.response?.data?.message || '세션 생성에 실패했습니다.');
    }
  };

  // 세션 클릭 핸들러
  const handleSessionClick = (session) => {
    setSelectedSession(session);
    setSessionModalVisible(true);
  };

  // 세션 종료
  const stopSession = async (sessionId) => {
    try {
      await nerveStimAPI.stopSession(sessionId, {});
      Alert.alert('성공', '세션이 종료되었습니다');
      setSessionModalVisible(false);
      fetchSessions();
    } catch (error) {
      console.error('Failed to stop session:', error);
      Alert.alert('오류', '세션 종료에 실패했습니다.');
    }
  };

  // 통계 계산
  const completedSessions = sessions.filter(s => s.status === 2);
  const inProgressSessions = sessions.filter(s => s.status === 1);
  const pendingSessions = sessions.filter(s => s.status === 0);

  const avgBPChange = completedSessions.length > 0
    ? (completedSessions
        .filter(s => s.bp_change != null)
        .reduce((acc, s) => acc + Math.abs(s.bp_change), 0) /
        completedSessions.filter(s => s.bp_change != null).length
      ).toFixed(1)
    : '0.0';

  const getStatusText = (status) => {
    const statusMap = { 0: '대기', 1: '진행중', 2: '완료', 3: '중단' };
    return statusMap[status] || '-';
  };

  const getStatusColor = (status) => {
    if (status === 2) return colors.primary;
    if (status === 1) return '#2196F3';
    if (status === 3) return '#E53935';
    return '#9E9E9E';
  };

  const getStatusChip = (status) => {
    return (
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
        <Text style={styles.statusText}>{getStatusText(status)}</Text>
      </View>
    );
  };

  // 로딩 화면
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      {/* 드롭다운 오버레이 */}
      {(bandOpen || levelOpen || durationOpen) && (
        <Modal
          visible={bandOpen || levelOpen || durationOpen}
          transparent={true}
          animationType="none"
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(128, 128, 128, 0.5)',
            }}
          />
        </Modal>
      )}

      <SafeAreaView style={styles.container}>
        <AppHeader />
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
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
                value={completedSessions.length}
                label="완료"
                color="darkGreen"
              />
            </View>
            <View style={styles.statCardWrapper}>
              <StatCard
                icon="timer"
                value={inProgressSessions.length}
                label="진행 중"
                color="darkGreen"
              />
            </View>
            <View style={styles.statCardWrapper}>
              <StatCard
                icon="heart-pulse"
                value={avgBPChange}
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
                <DropDownPicker
                  open={bandOpen}
                  value={selectedBand}
                  items={bands.map(band => ({
                    label: `${band.wearer_name || band.name} (${band.bid.slice(-4)})`,
                    value: band.bid
                  }))}
                  setOpen={setBandOpen}
                  setValue={setSelectedBand}
                  placeholder="밴드 선택"
                  listMode="MODAL"
                  modalProps={{
                    animationType: "fade",
                    transparent: true,
                  }}
                  modalContentContainerStyle={{
                    backgroundColor: 'white',
                    borderRadius: scaleSize(16),
                    padding: spacing.md,
                    maxHeight: '50%',
                    width: '80%',
                    alignSelf: 'center',
                    marginTop: '25%',
                  }}
                  modalTitleStyle={{
                    fontSize: scaleFontSize(16),
                    fontWeight: 'bold',
                    color: colors.text,
                    flex: 1,
                    marginTop: scaleSize(6),
                  }}
                  modalTitle="밴드 선택"
                  showTickIcon={true}
                  TickIconComponent={({style}) => (
                    <MaterialCommunityIcons name="check" size={20} color={colors.text} />
                  )}
                  CloseIconComponent={({style}) => (
                    <View style={{
                      backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#BDBDBD',
                      borderRadius: scaleSize(6),
                      paddingVertical: scaleSize(6),
                      paddingHorizontal: scaleSize(12),
                    }}>
                      <Text style={{ fontSize: scaleFontSize(12), color: '#666' }}>닫기</Text>
                    </View>
                  )}
                  closeIconContainerStyle={{
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  modalTitleContainerStyle={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingBottom: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: '#BDBDBD',
                    marginBottom: spacing.sm,
                  }}
                  style={styles.dropdown}
                  textStyle={styles.dropdownText}
                  placeholderStyle={styles.dropdownPlaceholder}
                  listItemContainerStyle={{
                    height: scaleSize(50),
                    justifyContent: 'center',
                  }}
                  listItemLabelStyle={{ fontSize: scaleFontSize(14), color: colors.text }}
                  itemSeparator={true}
                  itemSeparatorStyle={{
                    backgroundColor: '#E0E0E0',
                  }}
                />
              </View>

              <View style={styles.formItem}>
                <Text style={styles.formLabel}>단계 선택</Text>
                <DropDownPicker
                  open={levelOpen}
                  value={selectedLevel}
                  items={[1, 2, 3, 4, 5, 6, 7].map(level => ({
                    label: `단계 ${level}`,
                    value: level.toString()
                  }))}
                  setOpen={setLevelOpen}
                  setValue={setSelectedLevel}
                  placeholder="단계 선택"
                  listMode="MODAL"
                  modalProps={{
                    animationType: "fade",
                    transparent: true,
                  }}
                  modalContentContainerStyle={{
                    backgroundColor: 'white',
                    borderRadius: scaleSize(16),
                    padding: spacing.md,
                    maxHeight: '50%',
                    width: '80%',
                    alignSelf: 'center',
                    marginTop: '25%',
                  }}
                  modalTitleStyle={{
                    fontSize: scaleFontSize(16),
                    fontWeight: 'bold',
                    color: colors.text,
                    flex: 1,
                    marginTop: scaleSize(6),
                  }}
                  modalTitle="단계 선택"
                  showTickIcon={true}
                  TickIconComponent={({style}) => (
                    <MaterialCommunityIcons name="check" size={20} color={colors.text} />
                  )}
                  CloseIconComponent={({style}) => (
                    <View style={{
                      backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#BDBDBD',
                      borderRadius: scaleSize(6),
                      paddingVertical: scaleSize(6),
                      paddingHorizontal: scaleSize(12),
                    }}>
                      <Text style={{ fontSize: scaleFontSize(12), color: '#666' }}>닫기</Text>
                    </View>
                  )}
                  closeIconContainerStyle={{
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  modalTitleContainerStyle={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingBottom: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: '#BDBDBD',
                    marginBottom: spacing.sm,
                  }}
                  style={styles.dropdown}
                  textStyle={styles.dropdownText}
                  placeholderStyle={styles.dropdownPlaceholder}
                  listItemContainerStyle={{
                    height: scaleSize(50),
                    justifyContent: 'center',
                  }}
                  listItemLabelStyle={{ fontSize: scaleFontSize(14), color: colors.text }}
                  itemSeparator={true}
                  itemSeparatorStyle={{
                    backgroundColor: '#E0E0E0',
                  }}
                />
              </View>

              <View style={styles.formItem}>
                <Text style={styles.formLabel}>시간 선택</Text>
                <DropDownPicker
                  open={durationOpen}
                  value={selectedDuration}
                  items={[10, 20, 30].map(duration => ({
                    label: `${duration}분`,
                    value: duration.toString()
                  }))}
                  setOpen={setDurationOpen}
                  setValue={setSelectedDuration}
                  placeholder="시간 선택"
                  listMode="MODAL"
                  modalProps={{
                    animationType: "fade",
                    transparent: true,
                  }}
                  modalContentContainerStyle={{
                    backgroundColor: 'white',
                    borderRadius: scaleSize(16),
                    padding: spacing.md,
                    maxHeight: '40%',
                    width: '80%',
                    alignSelf: 'center',
                    marginTop: '30%',
                  }}
                  modalTitleStyle={{
                    fontSize: scaleFontSize(16),
                    fontWeight: 'bold',
                    color: colors.text,
                    flex: 1,
                    marginTop: scaleSize(6),
                  }}
                  modalTitle="시간 선택"
                  showTickIcon={true}
                  TickIconComponent={({style}) => (
                    <MaterialCommunityIcons name="check" size={20} color={colors.text} />
                  )}
                  CloseIconComponent={({style}) => (
                    <View style={{
                      backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#BDBDBD',
                      borderRadius: scaleSize(6),
                      paddingVertical: scaleSize(6),
                      paddingHorizontal: scaleSize(12),
                    }}>
                      <Text style={{ fontSize: scaleFontSize(12), color: '#666' }}>닫기</Text>
                    </View>
                  )}
                  closeIconContainerStyle={{
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  modalTitleContainerStyle={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingBottom: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: '#BDBDBD',
                    marginBottom: spacing.sm,
                  }}
                  style={styles.dropdown}
                  textStyle={styles.dropdownText}
                  placeholderStyle={styles.dropdownPlaceholder}
                  listItemContainerStyle={{
                    height: scaleSize(50),
                    justifyContent: 'center',
                  }}
                  listItemLabelStyle={{ fontSize: scaleFontSize(14), color: colors.text }}
                  itemSeparator={true}
                  itemSeparatorStyle={{
                    backgroundColor: '#E0E0E0',
                  }}
                />
              </View>

              <TouchableOpacity style={styles.createButton} onPress={createSession}>
                <Text style={styles.createButtonText}>세션 생성</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 세션 목록 */}
          <Text style={styles.sectionTitle}>세션 목록 ({sessions.length})</Text>
          <View style={[styles.card, shadow.small]}>
            {sessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="flash-off" size={48} color={colors.textLight} />
                <Text style={styles.emptyText}>진행 중인 세션이 없습니다</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* 테이블 헤더 */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.colBandId]}>밴드</Text>
                    <Text style={[styles.tableHeaderText, styles.colUser]}>사용자</Text>
                    <Text style={[styles.tableHeaderText, styles.colLevel]}>단계</Text>
                    <Text style={[styles.tableHeaderText, styles.colDuration]}>시간</Text>
                    <Text style={[styles.tableHeaderText, styles.colBP]}>혈압(전)</Text>
                    <Text style={[styles.tableHeaderText, styles.colBP]}>혈압(후)</Text>
                    <Text style={[styles.tableHeaderText, styles.colChange]}>변화</Text>
                    <Text style={[styles.tableHeaderText, styles.colStatus]}>상태</Text>
                  </View>

                  {/* 테이블 데이터 */}
                  {sessions.map((session, index) => {
                    const bpBefore = session.bp_systolic_before && session.bp_diastolic_before
                      ? `${session.bp_systolic_before}/${session.bp_diastolic_before}`
                      : '-';
                    const bpAfter = session.bp_systolic_after && session.bp_diastolic_after
                      ? `${session.bp_systolic_after}/${session.bp_diastolic_after}`
                      : '-';
                    const change = session.bp_change != null ? `${session.bp_change > 0 ? '-' : '+'}${Math.abs(session.bp_change)}` : '-';

                    return (
                      <TouchableOpacity
                        key={session.id}
                        style={[styles.tableRow, index < sessions.length - 1 && styles.tableBorder]}
                        onPress={() => handleSessionClick(session)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.tableCell, styles.colBandId]}>
                          {session.bid ? session.bid.slice(-4) : '-'}
                        </Text>
                        <Text style={[styles.tableCell, styles.colUser, styles.tableCellBold]}>
                          {session.wearer_name || '-'}
                        </Text>
                        <Text style={[styles.tableCell, styles.colLevel]}>{session.stim_level}</Text>
                        <Text style={[styles.tableCell, styles.colDuration]}>
                          {session.duration_actual || session.duration}분
                        </Text>
                        <Text style={[styles.tableCell, styles.colBP]}>{bpBefore}</Text>
                        <Text style={[styles.tableCell, styles.colBP]}>{bpAfter}</Text>
                        <Text
                          style={[
                            styles.tableCell,
                            styles.colChange,
                            change !== '-' && styles.textGreen,
                            change !== '-' && styles.tableCellBold,
                          ]}
                        >
                          {change}
                        </Text>
                        <View style={[styles.tableCell, styles.colStatus]}>
                          {getStatusChip(session.status)}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </SafeAreaView>

      {/* 세션 상세 모달 */}
      <Modal
        visible={sessionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSessionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedSession && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>세션 상세</Text>
                  <TouchableOpacity
                    onPress={() => setSessionModalVisible(false)}
                    style={styles.modalCloseButton}
                  >
                    <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* 상태 배지 */}
                  <View style={styles.modalStatusContainer}>
                    {getStatusChip(selectedSession.status)}
                  </View>

                  {/* 세션 ID */}
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>세션 ID</Text>
                    <Text style={styles.modalValue}>{selectedSession.session_id}</Text>
                  </View>

                  {/* 사용자 정보 */}
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>사용자</Text>
                    <Text style={styles.modalValue}>{selectedSession.wearer_name || '-'}</Text>
                  </View>

                  {/* 밴드 ID */}
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>밴드 ID</Text>
                    <Text style={styles.modalValue}>{selectedSession.bid || '-'}</Text>
                  </View>

                  {/* 자극 설정 */}
                  <View style={styles.modalDivider} />
                  <Text style={styles.modalSectionTitle}>자극 설정</Text>

                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>자극 단계</Text>
                    <Text style={styles.modalValue}>단계 {selectedSession.stim_level}</Text>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>주파수</Text>
                    <Text style={styles.modalValue}>{selectedSession.frequency} Hz</Text>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>펄스 폭</Text>
                    <Text style={styles.modalValue}>{selectedSession.pulse_width} μs</Text>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>목표 신경</Text>
                    <Text style={styles.modalValue}>{selectedSession.target_nerve || '-'}</Text>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>예정 시간</Text>
                    <Text style={styles.modalValue}>{selectedSession.duration}분</Text>
                  </View>

                  {selectedSession.duration_actual && (
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>실제 시간</Text>
                      <Text style={styles.modalValue}>{selectedSession.duration_actual}분</Text>
                    </View>
                  )}

                  {/* 시간 정보 */}
                  <View style={styles.modalDivider} />
                  <Text style={styles.modalSectionTitle}>시간 정보</Text>

                  {selectedSession.started_at && (
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>시작 시간</Text>
                      <Text style={styles.modalValue}>
                        {new Date(selectedSession.started_at).toLocaleString('ko-KR')}
                      </Text>
                    </View>
                  )}

                  {selectedSession.ended_at && (
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>종료 시간</Text>
                      <Text style={styles.modalValue}>
                        {new Date(selectedSession.ended_at).toLocaleString('ko-KR')}
                      </Text>
                    </View>
                  )}

                  {/* 혈압 정보 */}
                  {(selectedSession.bp_systolic_before || selectedSession.bp_systolic_after) && (
                    <>
                      <View style={styles.modalDivider} />
                      <Text style={styles.modalSectionTitle}>혈압 정보</Text>

                      {selectedSession.bp_systolic_before && (
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalLabel}>자극 전 혈압</Text>
                          <Text style={styles.modalValue}>
                            {selectedSession.bp_systolic_before}/{selectedSession.bp_diastolic_before} mmHg
                          </Text>
                        </View>
                      )}

                      {selectedSession.bp_systolic_after && (
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalLabel}>자극 후 혈압</Text>
                          <Text style={styles.modalValue}>
                            {selectedSession.bp_systolic_after}/{selectedSession.bp_diastolic_after} mmHg
                          </Text>
                        </View>
                      )}

                      {selectedSession.bp_change != null && (
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalLabel}>혈압 변화</Text>
                          <Text style={[styles.modalValue, styles.textGreen]}>
                            {selectedSession.bp_change > 0 ? '-' : '+'}{Math.abs(selectedSession.bp_change)} mmHg
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  {selectedSession.end_reason && (
                    <>
                      <View style={styles.modalDivider} />
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalLabel}>종료 사유</Text>
                        <Text style={styles.modalValue}>{selectedSession.end_reason}</Text>
                      </View>
                    </>
                  )}
                </ScrollView>

                {/* 하단 버튼 */}
                {(selectedSession.status === 0 || selectedSession.status === 1) && (
                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={styles.stopButton}
                      onPress={() => stopSession(selectedSession.session_id)}
                    >
                      <MaterialCommunityIcons name="stop" size={20} color="white" />
                      <Text style={styles.stopButtonText}>세션 종료</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
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
    overflow: 'visible',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: scaleFontSize(13),
    color: colors.textLight,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  formItem: {
    width: scaleSize(150),
  },
  formLabel: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scaleSize(8),
    backgroundColor: 'white',
    width: scaleSize(150),
    height: scaleSize(44),
    minHeight: scaleSize(44),
  },
  dropdownText: {
    fontSize: scaleFontSize(12),
    color: colors.text,
  },
  dropdownPlaceholder: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
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
    width: scaleSize(70),
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
    width: scaleSize(60),
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
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: 'white',
    borderRadius: scaleSize(16),
    ...shadow.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: colors.text,
  },
  modalCloseButton: {
    padding: scaleSize(4),
  },
  modalBody: {
    padding: spacing.md,
    maxHeight: scaleSize(500),
  },
  modalStatusContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  modalLabel: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
    flex: 1,
  },
  modalValue: {
    fontSize: scaleFontSize(12),
    color: colors.text,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  modalSectionTitle: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  modalFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  stopButton: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleSize(12),
    borderRadius: scaleSize(8),
    gap: spacing.xs,
  },
  stopButtonText: {
    color: 'white',
    fontSize: scaleFontSize(14),
    fontWeight: '600',
  },
});

export default NerveStimScreen;
