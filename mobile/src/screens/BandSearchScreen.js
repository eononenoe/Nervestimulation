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
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';
import { bandAPI } from '../services/api';

const BandSearchScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedBand, setSelectedBand] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

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

  // 선택된 밴드의 위치 정보
  const selectedBandLocation = selectedBand && selectedBand.latitude && selectedBand.longitude ? {
    id: selectedBand.id,
    user: selectedBand.name,
    lat: selectedBand.latitude,
    lng: selectedBand.longitude,
    status: selectedBand.connect_state === 1 ? 'online' : 'offline'
  } : null;

  // 선택된 밴드의 위치 지도 HTML 생성
  const locationMapHtml = selectedBandLocation ? `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100vw; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([${selectedBandLocation.lat}, ${selectedBandLocation.lng}], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        // 온라인/오프라인 마커
        var greenIcon = L.divIcon({
          className: 'custom-icon',
          html: '<div style="background-color:#43E396;width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        var greyIcon = L.divIcon({
          className: 'custom-icon',
          html: '<div style="background-color:#9ca3af;width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        // 밴드 데이터
        var band = {
          id: '${selectedBandLocation.id}',
          user: '${selectedBandLocation.user}',
          lat: ${selectedBandLocation.lat},
          lng: ${selectedBandLocation.lng},
          status: '${selectedBandLocation.status}'
        };

        var icon = band.status === 'online' ? greenIcon : greyIcon;
        var marker = L.marker([band.lat, band.lng], {icon: icon}).addTo(map);

        marker.bindPopup('<b>' + band.user + '</b><br>' + (band.status === 'online' ? '온라인' : '오프라인'));
        marker.openPopup();
      </script>
    </body>
    </html>
  ` : null;

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
                  <Text style={styles.detailLabel}>사용자명</Text>
                  <Text style={styles.detailValue}>{selectedBand?.name}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>심박수</Text>
                  <Text style={[styles.detailValue, styles.vitalValue]}>
                    {selectedBand?.hr || '-'} {selectedBand?.hr ? 'BPM' : ''}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SpO2</Text>
                  <Text style={[styles.detailValue, styles.vitalValue]}>
                    {selectedBand?.spo2 ? `${selectedBand.spo2}%` : '-'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>배터리</Text>
                  <Text style={[styles.detailValue, styles.vitalValue]}>
                    {selectedBand?.battery > 0 ? `${selectedBand.battery}%` : '-'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>상태</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBand?.status) }]}>
                    <Text style={styles.statusText}>{selectedBand?.status}</Text>
                  </View>
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
              {locationMapHtml ? (
                <>
                  <View style={styles.locationMapContainer}>
                    <WebView
                      style={styles.locationMap}
                      originWhitelist={['*']}
                      source={{ html: locationMapHtml }}
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                      scrollEnabled={false}
                    />
                  </View>

                  <View style={styles.locationInfo}>
                    <Text style={styles.locationInfoText}>위도: {selectedBandLocation?.lat}</Text>
                    <Text style={styles.locationInfoText}>경도: {selectedBandLocation?.lng}</Text>
                    <Text style={styles.locationInfoText}>상태: {selectedBandLocation?.status === 'online' ? '온라인' : '오프라인'}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.locationPlaceholder}>
                  <MaterialCommunityIcons name="map-marker-off" size={64} color={colors.textLight} />
                  <Text style={styles.locationText}>위치 정보 없음</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setLocationModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>닫기</Text>
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
