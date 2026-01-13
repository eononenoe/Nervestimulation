import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors, gradients } from '../utils/theme';
import { scaleFontSize, scaleSize, spacing } from '../utils/responsive';

const LoginScreen = () => {
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      alert('아이디와 비밀번호를 입력하세요');
      return;
    }

    const result = await login(username, password);
    if (!result.success) {
      alert(result.error || '로그인에 실패했습니다');
    }
  };

  return (
    <LinearGradient colors={gradients.primary} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons
            name="heart-pulse"
            size={scaleSize(48)}
            color={colors.accent}
          />
          <Text style={styles.logoText}>Wellsafer</Text>
          <Text style={styles.logoSubtext}>건강관리 통합 플랫폼</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons
              name="account"
              size={scaleSize(20)}
              color={colors.greyLight}
            />
            <TextInput
              style={styles.input}
              placeholder="아이디"
              placeholderTextColor={colors.greyLight}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons
              name="lock"
              size={scaleSize(20)}
              color={colors.greyLight}
            />
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              placeholderTextColor={colors.greyLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>로그인</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>v1.0.0</Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoText: {
    fontSize: scaleFontSize(32),
    fontWeight: '700',
    color: 'white',
    marginTop: spacing.md,
    letterSpacing: -1,
  },
  logoSubtext: {
    fontSize: scaleFontSize(14),
    color: 'white',
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  form: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: scaleSize(16),
    padding: spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: scaleSize(12),
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingLeft: spacing.sm,
    fontSize: scaleFontSize(14),
    color: colors.text,
  },
  loginButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: scaleSize(12),
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  loginButtonText: {
    color: 'white',
    fontSize: scaleFontSize(16),
    fontWeight: '600',
  },
  errorText: {
    color: '#fecaca',
    fontSize: scaleFontSize(12),
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  versionText: {
    color: 'white',
    fontSize: scaleFontSize(12),
    textAlign: 'center',
    marginTop: spacing.xxl,
    opacity: 0.6,
  },
});

export default LoginScreen;
