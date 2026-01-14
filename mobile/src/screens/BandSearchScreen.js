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
import { WebView } from 'react-native-webview';
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

  // 모의 밴드 위치 데이터
  const bandLocations = [
    { id: '467191213660619', user: '김태현', lat: 36.1200, lng: 128.3460, status: 'online' },
    { id: '467191213660620', user: '강민준', lat: 36.1180, lng: 128.3430, status: 'online' },
    { id: '467191213660614', user: '윤서연', lat: 36.1210, lng: 128.3420, status: 'online' },
    { id: '467191213660616', user: '이수빈', lat: 36.1190, lng: 128.3450, status: 'online' },
    { id: '467191213660623', user: '박도현', lat: 36.1185, lng: 128.3440, status: 'offline' },
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

  // 선택된 밴드의 위치 찾기
  const selectedBandLocation = selectedBand ? bandLocations.find(
    loc => loc.id === selectedBand.id || loc.user === selectedBand.name
  ) : null;

  // 선택된 밴드의 위치 지도 HTML 생성 (대시보드 방식과 동일)
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
                    <Text style={styles.locationInfoText}>마지막 업데이트: 방금 전</Text>
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
