import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, gradients, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const StatCard = ({ icon, value, label, color = 'green', onPress }) => {
  const getGradient = () => {
    switch (color) {
      case 'green':
        return gradients.green;
      case 'darkGreen':
        return gradients.darkGreen;
      case 'orange':
        return gradients.orange;
      case 'red':
        return gradients.red;
      case 'blue':
        return gradients.blue;
      case 'purple':
        return gradients.purple;
      default:
        return gradients.green;
    }
  };

  const getBorderColor = () => {
    switch (color) {
      case 'green':
        return '#66bd34';
      case 'darkGreen':
        return colors.primary;
      case 'orange':
        return colors.warning;
      case 'red':
        return colors.danger;
      case 'blue':
        return '#3b82f6';
      case 'purple':
        return '#8b5cf6';
      default:
        return colors.accent;
    }
  };

  return (
    <View style={[styles.card, shadow.small]}>
      {/* 좌측 컬러 바 */}
      <View style={[styles.colorBar, { backgroundColor: getBorderColor() }]} />

      {/* 아이콘 */}
      <LinearGradient colors={getGradient()} style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon} size={scaleSize(16)} color="white" />
      </LinearGradient>

      {/* 값 */}
      <Text style={styles.value}>{value}</Text>

      {/* 라벨 */}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: scaleSize(14),
    padding: scaleSize(14),
    position: 'relative',
    overflow: 'hidden',
  },
  colorBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: scaleSize(4),
    height: '100%',
  },
  iconContainer: {
    width: scaleSize(32),
    height: scaleSize(32),
    borderRadius: scaleSize(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: scaleFontSize(22),
    fontWeight: '700',
    color: colors.text,
    lineHeight: scaleFontSize(22),
  },
  label: {
    fontSize: scaleFontSize(10),
    color: colors.textLight,
    marginTop: spacing.xs,
  },
});

export default StatCard;
