import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';
import { dashboardAPI } from '../services/api';

const AlertHistoryScreen = ({ navigation }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // all, danger, warning, unresolved

  // 알림 데이터 로드
  const fetchAlerts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // 최근 100개 이벤트 가져오기
      const response = await dashboardAPI.getEvents(100);
      const eventsData = response.data.data || response.data;

      // 이벤트를 alerts 형식으로 변환
      const formattedAlerts = eventsData.map(event => ({
        id: event.id,
        userName: event.wearer_name || event.bid,
        message: event.message,
        level: event.event_level >= 4 ? 'danger' : event.event_level >= 3 ? 'warning' : 'info',
        type: event.event_type,
        datetime: event.datetime,
        bid: event.bid,
        isRead: event.is_read || false,
        isResolved: event.is_resolved || false,
      }));

      setAlerts(formattedAlerts);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError('알림 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleRefresh = () => {
    fetchAlerts(true);
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'sos':
        return 'alert-octagon';
      case 'fall':
        return 'human-handsdown';
      case 'hr_high':
      case 'hr_low':
        return 'heart-pulse';
      case 'spo2_low':
        return 'water-percent';
      default:
        return 'bell-alert';
    }
  };

  const getAlertColor = (level) => {
    switch (level) {
      case 'danger':
        return colors.danger;
      case 'warning':
        return '#FF9800';
      case 'info':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getLevelText = (level) => {
    switch (level) {
      case 'danger':
        return '위험';
      case 'warning':
        return '주의';
      case 'info':
        return '정보';
      default:
        return '알림';
    }
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return '';

    const date = new Date(datetime);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${month}/${day} ${hours}:${minutes}`;
  };

  // 필터링된 알림 목록
  const getFilteredAlerts = () => {
    switch (activeFilter) {
      case 'danger':
        return alerts.filter(alert => alert.level === 'danger');
      case 'warning':
        return alerts.filter(alert => alert.level === 'warning');
      case 'unresolved':
        return alerts.filter(alert => !alert.isResolved);
      case 'all':
      default:
        return alerts;
    }
  };

  const filteredAlerts = getFilteredAlerts();

  const renderAlertItem = (alert) => {
    const alertColor = getAlertColor(alert.level);
    const alertIcon = getAlertIcon(alert.type);

    return (
      <TouchableOpacity
        key={alert.id}
        style={[
          styles.alertCard,
          shadow.small,
          !alert.isRead && styles.unreadAlert,
        ]}
        onPress={() => {
          // TODO: 알림 상세보기 또는 해당 밴드로 이동
          console.log('Alert clicked:', alert);
        }}
      >
        <View style={styles.alertIconContainer}>
          <View style={[styles.alertIconCircle, { backgroundColor: alertColor }]}>
            <MaterialCommunityIcons name={alertIcon} size={24} color="white" />
          </View>
        </View>

        <View style={styles.alertContent}>
          <View style={styles.alertHeader}>
            <Text style={styles.alertUserName}>{alert.userName}</Text>
            <View style={[styles.levelBadge, { backgroundColor: alertColor }]}>
              <Text style={styles.levelText}>{getLevelText(alert.level)}</Text>
            </View>
          </View>

          <Text style={styles.alertMessage} numberOfLines={2}>
            {alert.message}
          </Text>

          <View style={styles.alertFooter}>
            <Text style={styles.alertTime}>{formatDateTime(alert.datetime)}</Text>
            {alert.isResolved && (
              <View style={styles.resolvedBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color={colors.primary} />
                <Text style={styles.resolvedText}>해결됨</Text>
              </View>
            )}
          </View>
        </View>

        {!alert.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  // 로딩 화면
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>알림을 불러오는 중...</Text>
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
          <Text style={styles.screenTitle}>알림 이력</Text>
          <Text style={styles.countText}>총 {filteredAlerts.length}건</Text>
        </View>

        {/* 필터 버튼 */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterButtonText, activeFilter === 'all' && styles.filterButtonTextActive]}>
              전체
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'danger' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('danger')}
          >
            <Text style={[styles.filterButtonText, activeFilter === 'danger' && styles.filterButtonTextActive]}>
              위험
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'warning' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('warning')}
          >
            <Text style={[styles.filterButtonText, activeFilter === 'warning' && styles.filterButtonTextActive]}>
              주의
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'unresolved' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('unresolved')}
          >
            <Text style={[styles.filterButtonText, activeFilter === 'unresolved' && styles.filterButtonTextActive]}>
              미해결
            </Text>
          </TouchableOpacity>
        </View>

        {/* 알림 목록 */}
        {filteredAlerts.length > 0 ? (
          <View style={styles.alertList}>
            {filteredAlerts.map(alert => renderAlertItem(alert))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bell-off-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>
              {activeFilter === 'all' ? '알림이 없습니다.' : '해당 조건의 알림이 없습니다.'}
            </Text>
          </View>
        )}

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
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    color: colors.text,
  },
  countText: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: scaleSize(8),
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: scaleFontSize(13),
    color: colors.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  alertList: {
    gap: spacing.md,
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: scaleSize(12),
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  unreadAlert: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  alertIconContainer: {
    marginRight: spacing.md,
  },
  alertIconCircle: {
    width: scaleSize(48),
    height: scaleSize(48),
    borderRadius: scaleSize(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  alertUserName: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    color: colors.text,
  },
  levelBadge: {
    paddingHorizontal: scaleSize(8),
    paddingVertical: scaleSize(4),
    borderRadius: scaleSize(6),
  },
  levelText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
    color: 'white',
  },
  alertMessage: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: scaleFontSize(20),
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTime: {
    fontSize: scaleFontSize(12),
    color: colors.textLight,
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  resolvedText: {
    fontSize: scaleFontSize(12),
    color: colors.primary,
    fontWeight: '500',
  },
  unreadDot: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: scaleSize(8),
    height: scaleSize(8),
    borderRadius: scaleSize(4),
    backgroundColor: colors.danger,
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
});

export default AlertHistoryScreen;
