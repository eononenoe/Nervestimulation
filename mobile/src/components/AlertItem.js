import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const AlertItem = ({ userName, message, level = 'warning', onPress }) => {
  const getDotColor = () => {
    return level === 'danger' ? colors.danger : colors.warning;
  };

  const getChipStyle = () => {
    return level === 'danger' ? styles.chipDanger : styles.chipWarning;
  };

  const getChipLabel = () => {
    return level === 'danger' ? '위험' : '주의';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* 상태 점 */}
      <View style={[styles.dot, { backgroundColor: getDotColor() }]} />

      {/* 내용 */}
      <View style={styles.content}>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>

      {/* 레벨 칩 */}
      <View style={[styles.chip, getChipStyle()]}>
        <Text style={[styles.chipText, getChipStyle()]}>{getChipLabel()}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dot: {
    width: scaleSize(8),
    height: scaleSize(8),
    borderRadius: scaleSize(4),
    marginRight: scaleSize(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: scaleSize(8),
    elevation: 4,
  },
  content: {
    flex: 1,
  },
  userName: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    color: colors.text,
  },
  message: {
    fontSize: scaleFontSize(10),
    color: colors.textLight,
    marginTop: scaleSize(1),
  },
  chip: {
    paddingVertical: scaleSize(3),
    paddingHorizontal: scaleSize(8),
    borderRadius: scaleSize(10),
  },
  chipDanger: {
    backgroundColor: '#fee2e2',
  },
  chipWarning: {
    backgroundColor: '#fef3c7',
  },
  chipText: {
    fontSize: scaleFontSize(9),
    fontWeight: '600',
  },
  chipTextDanger: {
    color: '#dc2626',
  },
  chipTextWarning: {
    color: '#d97706',
  },
});

export default AlertItem;
