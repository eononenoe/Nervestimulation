import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 앱 시작시 저장된 인증 정보 로드
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);

      console.log('=== LOGIN ATTEMPT ===');
      console.log('Username:', username);

      // 실제 API 호출
      const response = await authAPI.login(username, password);
      console.log('SUCCESS Login response:', response.data);

      // 백엔드 응답 구조: { success: true, data: { token, user } }
      const responseData = response.data.data || response.data;
      const { token: newToken, user: newUser } = responseData;

      // 토큰과 사용자 정보 저장
      await AsyncStorage.setItem('token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);

      console.log('SUCCESS Login successful, user:', newUser);
      return { success: true };
    } catch (error) {
      console.error('ERROR Login error:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      let errorMessage;
      if (error.response) {
        // 서버가 응답했지만 에러 (401, 400 등)
        errorMessage = error.response?.data?.error ||
          error.response?.data?.message ||
          '아이디 또는 비밀번호가 올바르지 않습니다.';
      } else if (error.request) {
        // 요청은 보냈지만 응답이 없음 (네트워크 에러)
        errorMessage = '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.';
        console.error('ERROR Network error - no response received');
      } else {
        // 요청 설정 중 에러
        errorMessage = '로그인 요청 중 오류가 발생했습니다.';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // 서버에 로그아웃 요청
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // 로컬 데이터 삭제
      await AsyncStorage.multiRemove(['token', 'user']);
      setToken(null);
      setUser(null);
    }
  };

  const updateUser = async (userData) => {
    try {
      const updatedUser = { ...user, ...userData };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
