import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, gradients } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const BandListItem = ({ band, onPress }) => {
  const { name, id, status, hr, spo2, bp, hrClass, bpClass } = band;

  const isOnline = status === 'online';
  const initial = name ? name.charAt(0) : '?';

  const getVitalColor = (vitalClass) => {
    if (vitalClass === 'danger') return colors.danger;
    if (vitalClass === 'warning') return colors.warning;
    return colors.text;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* 아바타 */}
      <LinearGradient colors={gradients.primary} style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </LinearGradient>

      {/* 밴드 정보 */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnline ? colors.online : colors.offline },
            ]}
          />
        </View>
        <Text style={styles.bandId}>{id}</Text>
      </View>

      {/* 바이탈 정보 */}
      <View style={styles.vitals}>
        {/* 혈압 */}
        <View style={styles.vitalItem}>
          <Text
            style={[
              styles.vitalValue,
              { color: getVitalColor(bpClass) },
            ]}
          >
            {bp || '-'}
          </Text>
          <Text style={styles.vitalLabel}>혈압</Text>
        </View>

        {/* 심박수 */}
        <View style={styles.vitalItem}>
          <Text
            style={[
              styles.vitalValue,
              { color: getVitalColor(hrClass) },
            ]}
          >
            {hr || '-'}
          </Text>
          <Text style={styles.vitalLabel}>심박</Text>
        </View>
      </View>

      {/* 화살표 */}
      <MaterialCommunityIcons
        name="chevron-right"
        size={scaleSize(20)}
        color={colors.greyLight}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  avatar: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleSize(10),
  },
  avatarText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: 'white',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSize(6),
  },
  name: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: colors.text,
  },
  statusDot: {
    width: scaleSize(6),
    height: scaleSize(6),
    borderRadius: scaleSize(3),
  },
  bandId: {
    fontSize: scaleFontSize(10),
    color: colors.textLight,
    marginTop: scaleSize(2),
  },
  vitals: {
    flexDirection: 'row',
    gap: spacing.md,
    marginRight: spacing.sm,
  },
  vitalItem: {
    alignItems: 'flex-end',
  },
  vitalValue: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
  },
  vitalLabel: {
    fontSize: scaleFontSize(9),
    color: colors.greyLight,
  },
});

export default BandListItem;
