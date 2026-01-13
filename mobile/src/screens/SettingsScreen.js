import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors, shadow } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const SettingsScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* User Info */}
        <View style={[styles.card, shadow.small]}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons
                name="account"
                size={scaleSize(32)}
                color="white"
              />
            </View>
            <View>
              <Text style={styles.userName}>{user?.name || '사용자'}</Text>
              <Text style={styles.userEmail}>{user?.email || user?.username}</Text>
            </View>
          </View>
        </View>

        {/* Settings Items */}
        <View style={[styles.card, shadow.small, styles.menuCard]}>
          <TouchableOpacity style={styles.menuItem}>
            <MaterialCommunityIcons
              name="server"
              size={scaleSize(20)}
              color={colors.primary}
            />
            <Text style={styles.menuText}>서버 설정</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={scaleSize(20)}
              color={colors.greyLight}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <MaterialCommunityIcons
              name="bell"
              size={scaleSize(20)}
              color={colors.primary}
            />
            <Text style={styles.menuText}>알림 설정</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={scaleSize(20)}
              color={colors.greyLight}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <MaterialCommunityIcons
              name="information"
              size={scaleSize(20)}
              color={colors.primary}
            />
            <Text style={styles.menuText}>앱 정보</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={scaleSize(20)}
              color={colors.greyLight}
            />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, shadow.small]}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons
            name="logout"
            size={scaleSize(20)}
            color={colors.danger}
          />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Wellsafer v1.0.0</Text>
      </View>
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
    padding: spacing.lg,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: scaleSize(14),
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: scaleSize(56),
    height: scaleSize(56),
    borderRadius: scaleSize(28),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: colors.text,
  },
  userEmail: {
    fontSize: scaleFontSize(13),
    color: colors.textLight,
    marginTop: scaleSize(4),
  },
  menuCard: {
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuText: {
    flex: 1,
    fontSize: scaleFontSize(14),
    color: colors.text,
    marginLeft: spacing.md,
  },
  logoutButton: {
    backgroundColor: 'white',
    borderRadius: scaleSize(14),
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: colors.danger,
  },
  versionText: {
    fontSize: scaleFontSize(12),
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});

export default SettingsScreen;
