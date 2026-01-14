import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import StatCard from '../components/StatCard';
import QuickActionButton from '../components/QuickActionButton';
import AlertItem from '../components/AlertItem';
import BandListItem from '../components/BandListItem';
import BandDetailModal from '../components/BandDetailModal';
import { useDashboard } from '../contexts/DashboardContext';
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const DashboardScreen = ({ navigation }) => {
  const dashboard = useDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBand, setSelectedBand] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // 구미 산호대로 253 좌표
  const GUMI_LAT = 36.1194;
  const GUMI_LNG = 128.3446;

  // 모의 밴드 위치 데이터
  const bandLocations = [
    { id: 'WS-2024-0001', user: '김영희', lat: 36.1200, lng: 128.3460, status: 'online' },
    { id: 'WS-2024-0002', user: '박철수', lat: 36.1180, lng: 128.3430, status: 'online' },
    { id: 'WS-2024-0003', user: '이민수', lat: 36.1210, lng: 128.3420, status: 'offline' },
  ];

  // Leaflet 지도 HTML
  const mapHtml = `
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
        var map = L.map('map').setView([36.1194, 128.3446], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        // 관리자 마커 (파란색)
        var blueIcon = L.divIcon({
          className: 'custom-icon',
          html: '<div style="background-color:#0078d4;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        L.marker([36.1194, 128.3446], {icon: blueIcon})
          .addTo(map)
          .bindPopup('<b>관리자</b><br>구미시 산호대로 253');

        // 밴드 마커들
        var greenIcon = L.divIcon({
          className: 'custom-icon',
          html: '<div style="background-color:#43E396;width:20px;height:20px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        var greyIcon = L.divIcon({
          className: 'custom-icon',
          html: '<div style="background-color:#9ca3af;width:20px;height:20px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        // 밴드 데이터
        var bands = [
          {id: 'WS-2024-0001', user: '김영희', lat: 36.1200, lng: 128.3460, status: 'online'},
          {id: 'WS-2024-0002', user: '박철수', lat: 36.1180, lng: 128.3430, status: 'online'},
          {id: 'WS-2024-0003', user: '이민수', lat: 36.1210, lng: 128.3420, status: 'offline'}
        ];

        // 마커 생성 및 클릭 이벤트
        bands.forEach(function(band) {
          var icon = band.status === 'online' ? greenIcon : greyIcon;
          var marker = L.marker([band.lat, band.lng], {icon: icon}).addTo(map);

          marker.bindPopup('<b>' + band.user + '</b><br>' + (band.status === 'online' ? '온라인' : '오프라인'));

          // 마커 클릭 시 React Native로 메시지 전송
          marker.on('click', function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify(band));
            }
          });
        });
      </script>
    </body>
    </html>
  `;

  // 초기 데이터 로드
  useEffect(() => {
    loadData();
    // 최대 로딩 시간 설정 (500ms 후 무조건 화면 표시)
    const timeout = setTimeout(() => {
      setInitialLoading(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        dashboard.loadDashboard(),
        dashboard.loadBands(),
      ]);
    } finally {
      setInitialLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleBandPress = (band) => {
    setSelectedBand(band);
    setModalVisible(true);
  };

  const handleLocationBandPress = (locationBand) => {
    console.log('Location band clicked:', locationBand);
    // bandLocations의 id로 dashboard.bands에서 실제 밴드 데이터 찾기
    const fullBandData = dashboard.bands?.find(b => b.band_id === locationBand.id || b.name === locationBand.user);
    console.log('Found band data:', fullBandData);
    console.log('All bands:', dashboard.bands);

    // 무조건 모달 열기 (데이터가 있으면 전체 데이터, 없으면 기본 데이터)
    const bandToShow = fullBandData || {
      id: locationBand.id,
      name: locationBand.user,
      band_id: locationBand.id,
      status: locationBand.status,
      hr: 72,
      spo2: '98%',
      bp: '128/82',
    };

    setSelectedBand(bandToShow);
    setModalVisible(true);
  };

  // 지도 마커 클릭 시 처리
  const handleMapMessage = (event) => {
    try {
      const bandData = JSON.parse(event.nativeEvent.data);
      handleLocationBandPress(bandData);
    } catch (error) {
      console.error('Map message parse error:', error);
    }
  };


  // 초기 로딩 화면
  if (initialLoading) {
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <AppHeader />

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <View style={styles.quickActionWrapper}>
            <QuickActionButton
              icon="flash"
              label="신경자극"
              color="stim"
              onPress={() => navigation.navigate('NerveStim')}
            />
          </View>
          <View style={styles.quickActionWrapper}>
            <QuickActionButton
              icon="heart"
              label="혈압관리"
              color="stim"
              onPress={() => navigation.navigate('BloodPressure')}
            />
          </View>
          <View style={styles.quickActionWrapper}>
            <QuickActionButton
              icon="file-chart"
              label="리포트"
              color="stim"
              onPress={() => navigation.navigate('Report')}
            />
          </View>
          <View style={styles.quickActionWrapper}>
            <QuickActionButton
              icon="watch"
              label="기기관리"
              color="stim"
              onPress={() => navigation.navigate('Device')}
            />
          </View>
        </View>

        {/* Map */}
        <View style={styles.mapCard}>
          <WebView
            style={styles.map}
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={false}
            onMessage={handleMapMessage}
          />

          {/* 지도 범례 */}
          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0078d4' }]} />
              <Text style={styles.legendText}>관리자</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.legendText}>온라인</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.greyLight }]} />
              <Text style={styles.legendText}>오프라인</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <Text style={[styles.sectionTitle, { marginBottom: spacing.sm }]}>현황 요약</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="watch"
              value={dashboard.bands?.length || 24}
              label="등록 밴드"
              color="darkGreen"
            />
          </View>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="broadcast"
              value={dashboard.bands?.filter(b => b.status === 'online').length || 18}
              label="온라인"
              color="green"
            />
          </View>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="alert"
              value={dashboard.alerts?.filter(a => a.level === 'warning').length || 3}
              label="주의"
              color="orange"
            />
          </View>
          <View style={styles.statCardWrapper}>
            <StatCard
              icon="alert-circle"
              value={dashboard.alerts?.filter(a => a.level === 'danger').length || 1}
              label="위험"
              color="red"
            />
          </View>
        </View>

        {/* Alerts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>생체신호 이상 감지</Text>
          <TouchableOpacity onPress={() => navigation.navigate('BandSearch')}>
            <Text style={styles.seeAll}>전체보기 ›</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.card, shadow.small]}>
          {dashboard.alerts && dashboard.alerts.length > 0 ? (
            dashboard.alerts.slice(0, 3).map((alert, index) => (
              <AlertItem
                key={index}
                userName={alert.userName}
                message={alert.message}
                level={alert.level}
                onPress={() => {
                  if (alert.band) {
                    handleBandPress(alert.band);
                  }
                }}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>알림이 없습니다</Text>
            </View>
          )}
        </View>

        {/* Band List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>밴드 목록</Text>
          <TouchableOpacity onPress={() => navigation.navigate('BandSearch')}>
            <Text style={styles.seeAll}>전체보기 ›</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.bandList, shadow.small]}>
          {dashboard.bands && dashboard.bands.length > 0 ? (
            dashboard.bands.slice(0, 4).map((band, index) => (
              <BandListItem
                key={index}
                band={band}
                onPress={() => handleBandPress(band)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>등록된 밴드가 없습니다</Text>
            </View>
          )}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Band Detail Modal */}
      <BandDetailModal
        visible={modalVisible}
        band={selectedBand}
        onClose={() => setModalVisible(false)}
        navigation={navigation}
        bandLocations={bandLocations}
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
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  quickActionWrapper: {
    width: '23.5%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: colors.primary,
  },
  seeAll: {
    fontSize: scaleFontSize(11),
    color: colors.textSecondary,
    fontWeight: '500',
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
    padding: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  bandList: {
    backgroundColor: 'white',
    borderRadius: scaleSize(14),
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: scaleFontSize(12),
    color: colors.textLight,
  },
  mapCard: {
    height: scaleSize(300),
    marginBottom: spacing.lg,
    backgroundColor: 'white',
    borderRadius: scaleSize(14),
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLegend: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    padding: spacing.sm,
    borderRadius: scaleSize(8),
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(4),
  },
  legendDot: {
    width: scaleSize(12),
    height: scaleSize(12),
    borderRadius: scaleSize(6),
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: scaleFontSize(11),
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
  },
});

export default DashboardScreen;
