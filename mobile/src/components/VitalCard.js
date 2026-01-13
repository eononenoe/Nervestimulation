import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const VitalCard = ({ icon, value, label, status = 'normal' }) => {
  const getCardStyle = () => {
    switch (status) {
      case 'warning':
        return styles.cardWarning;
      case 'danger':
        return styles.cardDanger;
      default:
        return styles.cardNormal;
    }
  };

  const getValueColor = () => {
    switch (status) {
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={[styles.card, getCardStyle()]}>
      {/* 아이콘 */}
      <Text style={styles.icon}>{icon}</Text>

      {/* 값 */}
      <Text style={[styles.value, { color: getValueColor() }]}>
        {value}
      </Text>

      {/* 라벨 */}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: scaleSize(12),
    padding: scaleSize(12),
    paddingHorizontal: scaleSize(8),
    alignItems: 'center',
    borderWidth: 1,
  },
  cardNormal: {
    backgroundColor: '#f0fdf4',
    borderColor: '#dcfce7',
  },
  cardWarning: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  cardDanger: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  icon: {
    fontSize: scaleFontSize(20),
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
  },
  label: {
    fontSize: scaleFontSize(9),
    color: colors.textLight,
    marginTop: scaleSize(2),
  },
});

export default VitalCard;
