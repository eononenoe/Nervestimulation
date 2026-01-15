import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const RealtimeNotification = ({ visible, type, message, userName, onPress, onClose }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 슬라이드 다운 애니메이션
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // 5초 후 자동으로 닫힘
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      // 슬라이드 업 애니메이션
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onClose) onClose();
    });
  };

  if (!visible) return null;

  // 타입에 따른 색상 및 아이콘
  const getTypeConfig = () => {
    switch (type) {
      case 'alert':
      case 'danger':
        return {
          icon: 'alert-circle',
          bgColor: colors.danger,
          iconColor: 'white',
        };
      case 'warning':
        return {
          icon: 'alert',
          bgColor: colors.warning,
          iconColor: 'white',
        };
      case 'sensor':
        return {
          icon: 'heart-pulse',
          bgColor: colors.accent,
          iconColor: 'white',
        };
      case 'event':
        return {
          icon: 'bell-ring',
          bgColor: colors.stim,
          iconColor: 'white',
        };
      default:
        return {
          icon: 'information',
          bgColor: colors.primary,
          iconColor: 'white',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.notification, shadow.medium]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
          <MaterialCommunityIcons
            name={config.icon}
            size={scaleSize(24)}
            color={config.iconColor}
          />
        </View>

        <View style={styles.content}>
          {userName && (
            <Text style={styles.userName} numberOfLines={1}>
              {userName}
            </Text>
          )}
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <MaterialCommunityIcons name="close" size={scaleSize(20)} color={colors.textLight} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? scaleSize(50) : scaleSize(10),
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
  },
  notification: {
    backgroundColor: 'white',
    borderRadius: scaleSize(12),
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: scaleSize(48),
    height: scaleSize(48),
    borderRadius: scaleSize(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  userName: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: colors.text,
    marginBottom: scaleSize(2),
  },
  message: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
    lineHeight: scaleFontSize(16),
  },
  closeButton: {
    padding: spacing.xs,
  },
});

export default RealtimeNotification;
