import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, gradients, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const QuickActionButton = ({ icon, label, color = 'stim', onPress }) => {
  const getGradient = () => {
    switch (color) {
      case 'stim':
        return gradients.darkGreen;
      case 'bp':
        return gradients.blue;
      case 'report':
        return gradients.purple;
      case 'device':
        return gradients.orange;
      default:
        return gradients.darkGreen;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, shadow.small]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* 아이콘 */}
      <LinearGradient colors={getGradient()} style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon} size={scaleSize(18)} color="white" />
      </LinearGradient>

      {/* 라벨 */}
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: scaleSize(12),
    padding: scaleSize(12),
    paddingHorizontal: scaleSize(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: scaleSize(36),
    height: scaleSize(36),
    borderRadius: scaleSize(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSize(6),
  },
  label: {
    fontSize: scaleFontSize(10),
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default QuickActionButton;
