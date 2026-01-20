import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import DropDownPicker from 'react-native-dropdown-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import BandDetailModal from '../components/BandDetailModal';
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';
import { bandAPI } from '../services/api';
import socketService from '../services/socket';

const BandSearchScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedBand, setSelectedBand] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // API 연동 상태
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // 밴드 데이터 로드
  const fetchBands = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await bandAPI.getList();

      if (response.data && response.data.success) {
        // API 응답 데이터를 UI 형식으로 변환
        const formattedBands = response.data.data.map(band => ({
          id: band.bid,
          name: band.wearer_name || '이름 없음',
          status: getStatus(band),
          hr: band.latest_hr || 0,
          spo2: band.latest_spo2 || 0,
          battery: band.battery || 0,
          latitude: band.latitude,
          longitude: band.longitude,
          connect_state: band.connect_state,
        }));

        setBands(formattedBands);
      }
    } catch (err) {
      console.error('Failed to fetch bands:', err);
      setError('밴드 데이터를 불러오는데 실패했습니다.');
      Alert.alert('오류', '밴드 데이터를 불러오는데 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 밴드 상태 판단
  const getStatus = (band) => {
    if (band.connect_state === 0) {
      return '오프라인';
    }

    // 최신 센서 데이터 기반 상태 판단
    const hr = band.latest_hr || 0;
    const spo2 = band.latest_spo2 || 0;

    // 심박수 이상 (60 미만 또는 100 초과) 또는 산소포화도 이상 (95 미만)
    if (hr > 0 && (hr < 60 || hr > 100) || (spo2 > 0 && spo2 < 95)) {
      return '주의';
    }

    return '정상';
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchBands();
  }, []);

  // Socket.IO 실시간 업데이트
  useEffect(() => {
    // 센서 데이터 업데이트 이벤트 리스닝
    const handleSensorUpdate = (data) => {
      console.log('[BandSearch] Sensor update received:', data);

      // 해당 밴드 찾아서 상태 업데이트
      setBands(prevBands => {
        return prevBands.map(band => {
          if (band.id === data.bid) {
            // 밴드 상태 업데이트
            const updatedBand = {
              ...band,
              hr: data.hr || band.hr,
              spo2: data.spo2 || band.spo2,
              battery: data.battery_level || band.battery,
              connect_state: 1, // 데이터가 왔다는 것은 연결됨을 의미
            };
            // 상태 재계산
            updatedBand.status = getStatus(updatedBand);
            return updatedBand;
          }
          return band;
        });
      });
    };

    // 알림 이벤트 리스닝 (밴드 연결 상태 변경 감지)
    const handleAlertNew = (data) => {
      console.log('[BandSearch] Alert received:', data);

      // 알림이 온 밴드는 온라인 상태로 업데이트
      if (data.bid) {
        setBands(prevBands => {
          return prevBands.map(band => {
            if (band.id === data.bid) {
              const updatedBand = {
                ...band,
                connect_state: 1,
              };
              updatedBand.status = getStatus(updatedBand);
              return updatedBand;
            }
            return band;
          });
        });
      }
    };

    // 밴드 상태 변경 이벤트 리스닝 (온라인/오프라인)
    const handleBandStatus = (data) => {
      console.log('[BandSearch] Band status changed:', data);

      if (data.bid) {
        setBands(prevBands => {
          return prevBands.map(band => {
            if (band.id === data.bid) {
              const updatedBand = {
                ...band,
                connect_state: data.status === 'offline' ? 0 : 1,
              };
              updatedBand.status = getStatus(updatedBand);
              return updatedBand;
            }
            return band;
          });
        });
      }
    };

    // 이벤트 리스너 등록
    socketService.on('sensor_update', handleSensorUpdate);
    socketService.on('alert_new', handleAlertNew);
    socketService.on('band_status', handleBandStatus);

    // 클린업
    return () => {
      socketService.off('sensor_update', handleSensorUpdate);
      socketService.off('alert_new', handleAlertNew);
      socketService.off('band_status', handleBandStatus);
    };
  }, []);

  // 새로고침 핸들러
  const handleRefresh = () => {
    fetchBands(true);
  };

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
          <Text style={styles.statValue}>{band.hr || '-'}</Text>
          <Text style={styles.statLabel}>HR</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{band.spo2 ? `${band.spo2}%` : '-'}</Text>
          <Text style={styles.statLabel}>SpO2</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[
            styles.statValue,
            band.battery > 0 && band.battery < 20 && { color: colors.danger }
          ]}>
            {band.battery > 0 ? `${band.battery}%` : '-'}
          </Text>
          <Text style={styles.statLabel}>배터리</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.bandActionButton, styles.actionButtonPrimary]}
        onPress={() => {
          const bandForModal = {
            id: band.id,
            band_id: band.id,
            name: band.name,
            status: band.connect_state === 1 ? 'online' : 'offline',
            hr: band.hr,
            spo2: band.spo2,
            battery: band.battery,
            latitude: band.latitude,
            longitude: band.longitude,
          };
          setSelectedBand(bandForModal);
          setDetailModalVisible(true);
        }}
      >
        <Text style={styles.actionButtonTextPrimary}>상세보기</Text>
      </TouchableOpacity>
    </View>
  );

  // 로딩 화면
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>밴드 데이터를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
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
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>밴드 조회</Text>
          <Text style={styles.countText}>총 {filteredBands.length}개</Text>
        </View>

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
            <View style={{ width: scaleSize(120) }}>
              <DropDownPicker
                open={statusOpen}
                value={statusFilter}
                items={[
                  { label: '전체', value: '' },
                  { label: '정상', value: '정상' },
                  { label: '주의', value: '주의' },
                  { label: '오프라인', value: '오프라인' },
                ]}
                setOpen={setStatusOpen}
                setValue={setStatusFilter}
                placeholder="상태 선택"
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
                  marginBottom: spacing.sm,
                }}
                modalTitle="상태 선택"
                style={styles.dropdown}
                textStyle={styles.dropdownText}
                placeholderStyle={styles.dropdownPlaceholder}
                listItemContainerStyle={{ height: scaleSize(50), justifyContent: 'center' }}
                listItemLabelStyle={{ fontSize: scaleFontSize(14) }}
              />
            </View>
          </View>
        </View>

        {/* 밴드 카드 그리드 */}
        {filteredBands.length > 0 ? (
          <View style={styles.bandGrid}>
            {filteredBands.map(band => renderBandCard(band))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="watch-variant" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>
              {searchText || statusFilter ? '검색 결과가 없습니다.' : '등록된 밴드가 없습니다.'}
            </Text>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* 상세보기 모달 - BandDetailModal 사용 */}
      <BandDetailModal
        visible={detailModalVisible}
        band={selectedBand}
        onClose={() => setDetailModalVisible(false)}
        navigation={navigation}
        bandLocations={bands.map(b => ({
          id: b.id,
          user: b.name,
          lat: b.latitude || 36.1194,
          lng: b.longitude || 128.3446,
          status: b.connect_state === 1 ? 'online' : 'offline'
        }))}
      />
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  screenTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: colors.text,
  },
  countText: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: scaleSize(14),
    padding: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'visible',
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
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
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scaleSize(8),
    backgroundColor: 'white',
    width: scaleSize(120),
    height: scaleSize(44),
    minHeight: scaleSize(44),
    zIndex: 3000,
  },
  dropdownText: {
    fontSize: scaleFontSize(12),
    color: colors.text,
  },
  dropdownPlaceholder: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
  },
  dropdownContainer: {
    borderColor: colors.border,
    backgroundColor: 'white',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleSize(80),
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
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
  bandActionButton: {
    width: '100%',
    paddingVertical: scaleSize(10),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scaleSize(8),
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    paddingVertical: scaleSize(8),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scaleSize(6),
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: scaleFontSize(12),
    fontWeight: '500',
    color: colors.text,
  },
  actionButtonTextPrimary: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    color: 'white',
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
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    color: '#257E53',
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
  locationMapContainer: {
    height: scaleSize(250),
    borderRadius: scaleSize(12),
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  locationMap: {
    width: '100%',
    height: '100%',
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
  closeButton: {
    width: '100%',
    paddingVertical: scaleSize(14),
    borderRadius: scaleSize(8),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  closeButtonText: {
    fontSize: scaleFontSize(16),
    fontWeight: 700,
    color: '#FFFFFF',
  },
});

export default BandSearchScreen;
