import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const BandSearchScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBand, setSelectedBand] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // 모의 밴드 데이터
  const bands = [
    {
      id: '467191213660619',
      name: '김태현',
      status: '정상',
      hr: 72,
      spo2: 98,
      battery: 85,
    },
    {
      id: '467191213660620',
      name: '강민준',
      status: '정상',
      hr: 68,
      spo2: 97,
      battery: 62,
    },
    {
      id: '467191213660614',
      name: '윤서연',
      status: '주의',
      hr: 92,
      spo2: 95,
      battery: 45,
    },
    {
      id: '467191213660616',
      name: '이수빈',
      status: '정상',
      hr: 75,
      spo2: 99,
      battery: 92,
    },
    {
      id: '467191213660623',
      name: '박도현',
      status: '오프라인',
      hr: 0,
      spo2: 0,
      battery: 15,
    },
  ];

  const getStatusColor = (status) => {
    if (status === '정상') return colors.primary;
    if (status === '주의') return '#FF9800';
    if (status === '위험') return '#E53935';
    return '#9E9E9E';
  };

  const filteredBands = bands.filter(band => {
    const matchSearch = searchText === '' ||
      band.name.toLowerCase().includes(searchText.toLowerCase()) ||
      band.id.includes(searchText);
    const matchStatus = statusFilter === '' || band.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const renderBandCard = (band) => (
    <View key={band.id} style={[styles.bandCard, shadow.small]}>
      <View style={styles.bandCardHeader}>
        <View>
          <Text style={styles.bandName}>{band.name}</Text>
          <Text style={styles.bandId}>{band.id}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(band.status) }]}>
          <Text style={styles.statusText}>{band.status}</Text>
        </View>
      </View>

      <View style={styles.bandStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{band.hr}</Text>
          <Text style={styles.statLabel}>HR</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{band.spo2}%</Text>
          <Text style={styles.statLabel}>SpO2</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[
            styles.statValue,
            band.battery < 20 && { color: colors.danger }
          ]}>
            {band.battery}%
          </Text>
          <Text style={styles.statLabel}>배터리</Text>
        </View>
      </View>

      <View style={styles.bandActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedBand(band);
            setDetailModalVisible(true);
          }}
        >
          <Text style={styles.actionButtonText}>상세보기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedBand(band);
            setLocationModalVisible(true);
          }}
        >
          <Text style={styles.actionButtonText}>위치확인</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>밴드 조회</Text>

        {/* 검색 및 필터 */}
        <View style={[styles.card, shadow.small]}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="밴드 ID 또는 사용자명 검색..."
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor={colors.textLight}
              />
            </View>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={statusFilter}
                onValueChange={setStatusFilter}
                style={styles.picker}
              >
                <Picker.Item label="상태 전체" value="" />
                <Picker.Item label="정상" value="정상" />
                <Picker.Item label="주의" value="주의" />
                <Picker.Item label="오프라인" value="오프라인" />
              </Picker>
            </View>
          </View>
        </View>

        {/* 밴드 카드 그리드 */}
        <View style={styles.bandGrid}>
          {filteredBands.map(band => renderBandCard(band))}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* 상세보기 모달 */}
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>사용자 상세 - {selectedBand?.name}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>밴드 ID</Text>
                  <Text style={styles.detailValue}>{selectedBand?.id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>그룹</Text>
                  <Text style={styles.detailValue}>A동</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>심박수</Text>
                  <Text style={[styles.detailValue, styles.vitalValue]}>{selectedBand?.hr} BPM</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SpO2</Text>
                  <Text style={[styles.detailValue, styles.vitalValue]}>{selectedBand?.spo2}%</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>혈압</Text>
                  <Text style={[styles.detailValue, styles.vitalValue]}>128/82 mmHg</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>배터리</Text>
                  <Text style={[styles.detailValue, styles.vitalValue]}>{selectedBand?.battery}%</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>상태</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBand?.status) }]}>
                    <Text style={styles.statusText}>{selectedBand?.status}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>eHG4S</Text>
                  <Text style={[styles.detailValue, { color: colors.primary, fontWeight: '600' }]}>연결됨</Text>
                </View>
              </View>

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => {
                    setDetailModalVisible(false);
                    setLocationModalVisible(true);
                  }}
                >
                  <Text style={styles.modalButtonTextPrimary}>위치 확인</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => {
                    setDetailModalVisible(false);
                    navigation.navigate('Dashboard', { screen: 'NerveStim' });
                  }}
                >
                  <Text style={styles.modalButtonText}>자극 세션</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 위치 확인 모달 */}
      <Modal
        visible={locationModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>위치 확인 - {selectedBand?.name}</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.locationPlaceholder}>
                <MaterialCommunityIcons name="map-marker" size={64} color={colors.primary} />
                <Text style={styles.locationText}>지도 영역</Text>
              </View>

              <View style={styles.locationInfo}>
                <Text style={styles.locationInfoText}>위도: 36.1194</Text>
                <Text style={styles.locationInfoText}>경도: 128.3446</Text>
                <Text style={styles.locationInfoText}>마지막 업데이트: 방금 전</Text>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { width: '100%' }]}
                onPress={() => setLocationModalVisible(false)}
              >
                <Text style={styles.modalButtonTextPrimary}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: spacing.lg,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scaleSize(8),
    paddingHorizontal: spacing.sm,
    backgroundColor: 'white',
  },
  searchInput: {
    flex: 1,
    height: scaleSize(44),
    fontSize: scaleFontSize(13),
    color: colors.text,
    marginLeft: spacing.xs,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scaleSize(8),
    overflow: 'hidden',
    backgroundColor: 'white',
    minWidth: scaleSize(120),
  },
  picker: {
    height: scaleSize(44),
  },
  bandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bandCard: {
    backgroundColor: 'white',
    borderRadius: scaleSize(14),
    padding: spacing.md,
    marginBottom: spacing.md,
    width: '48%',
  },
  bandCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bandName: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: colors.text,
  },
  bandId: {
    fontSize: scaleFontSize(11),
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  bandStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: scaleFontSize(10),
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  bandActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: scaleSize(8),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scaleSize(6),
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: scaleFontSize(12),
    fontWeight: '500',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: scaleSize(12),
    width: '100%',
    maxHeight: '80%',
    ...shadow.small,
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
    fontWeight: '600',
    color: colors.text,
  },
  modalContent: {
    padding: spacing.md,
  },
  detailSection: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: scaleFontSize(13),
    color: colors.text,
    fontWeight: '500',
  },
  vitalValue: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: scaleSize(12),
    borderRadius: scaleSize(8),
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  modalButtonSecondary: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: 'white',
  },
  modalButtonTextPrimary: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: colors.primary,
  },
  locationPlaceholder: {
    height: scaleSize(250),
    backgroundColor: '#f0f9ff',
    borderRadius: scaleSize(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  locationText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  locationInfo: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: scaleSize(8),
    marginBottom: spacing.md,
  },
  locationInfoText: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});

export default BandSearchScreen;
