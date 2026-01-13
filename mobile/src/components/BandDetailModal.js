import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import VitalCard from './VitalCard';
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const { height } = Dimensions.get('window');

const BandDetailModal = ({ visible, band, onClose, navigation }) => {
  if (!band) return null;

  const handleNerveStim = () => {
    onClose();
    navigation.navigate('NerveStim');
  };

  const handleReport = () => {
    onClose();
    navigation.navigate('Report');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Modal Content */}
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{band.name || '사용자'}</Text>
              <Text style={styles.subtitle}>{band.id || band.band_id}</Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={styles.statusText}>
                {band.status === 'online' ? '연결됨' : '오프라인'}
              </Text>
            </View>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {/* 실시간 생체신호 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>실시간 생체신호</Text>
              <View style={styles.vitalsGrid}>
                <View style={styles.vitalCardWrapper}>
                  <VitalCard
                    icon="❤️"
                    value={band.hr || '-'}
                    label="심박수"
                    status={band.hrClass}
                  />
                </View>
                <View style={styles.vitalCardWrapper}>
                  <VitalCard
                    icon="🫁"
                    value={band.spo2 || '-'}
                    label="SpO2"
                    status={band.spo2Class}
                  />
                </View>
                <View style={styles.vitalCardWrapper}>
                  <VitalCard
                    icon="🩺"
                    value={band.bp || '-'}
                    label="혈압"
                    status={band.bpClass}
                  />
                </View>
              </View>
            </View>

            {/* 기기 상태 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>기기 상태</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>배터리</Text>
                  <Text style={styles.infoValue}>{band.battery || 85}%</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>신호 강도</Text>
                  <Text style={styles.infoValue}>{band.signal || '-65 dBm'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>펌웨어</Text>
                  <Text style={styles.infoValue}>{band.firmware || 'v2.1.4'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>마지막 동기화</Text>
                  <Text style={styles.infoValue}>방금 전</Text>
                </View>
              </View>
            </View>

            {/* 액션 버튼 */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleNerveStim}>
                <Text style={styles.btnPrimaryText}>신경자극 시작</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnOutline} onPress={handleReport}>
                <Text style={styles.btnOutlineText}>리포트 생성</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: scaleSize(24),
    borderTopRightRadius: scaleSize(24),
    maxHeight: height * 0.85,
  },
  handle: {
    width: scaleSize(40),
    height: scaleSize(4),
    backgroundColor: colors.border,
    borderRadius: scaleSize(2),
    alignSelf: 'center',
    marginTop: scaleSize(10),
    marginBottom: scaleSize(10),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: scaleFontSize(11),
    color: colors.textLight,
    marginTop: scaleSize(2),
  },
  statusChip: {
    backgroundColor: '#dcfce7',
    paddingVertical: scaleSize(4),
    paddingHorizontal: scaleSize(12),
    borderRadius: scaleSize(12),
  },
  statusText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
    color: colors.success,
  },
  body: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    color: colors.primary,
    marginBottom: scaleSize(10),
    paddingBottom: scaleSize(6),
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  vitalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  vitalCardWrapper: {
    flex: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.borderLight,
    borderRadius: scaleSize(10),
    padding: scaleSize(10),
  },
  infoLabel: {
    fontSize: scaleFontSize(10),
    color: colors.textLight,
    marginBottom: scaleSize(2),
  },
  infoValue: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: scaleSize(10),
    marginTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: scaleSize(12),
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: 'white',
  },
  btnOutline: {
    flex: 1,
    backgroundColor: 'white',
    padding: spacing.md,
    borderRadius: scaleSize(12),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  btnOutlineText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: colors.primary,
  },
});

export default BandDetailModal;
