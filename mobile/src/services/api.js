import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Expo에서 자동으로 PC IP 감지
const getLocalIP = () => {
  try {
    // Expo Go에서 실행 중일 때 manifest에서 IP 추출
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
    const debuggerHost = Constants.manifest?.debuggerHost;

    // hostUri 또는 debuggerHost에서 IP 추출 (예: "192.168.0.123:8081" → "192.168.0.123")
    const host = hostUri || debuggerHost;
    if (host) {
      const ip = host.split(':')[0];
      console.log('🔍 Auto-detected PC IP:', ip);
      return ip;
    }
  } catch (error) {
    console.warn('⚠️ Failed to auto-detect IP:', error);
  }

  // Fallback: 기본값
  console.log('⚠️ Using fallback IP: 192.168.0.100');
  return '192.168.0.100';
};

// API URL 자동 감지
// - Android 에뮬레이터: 10.0.2.2 (호스트 컴퓨터)
// - iOS 시뮬레이터: localhost
// - 실제 기기 (아이폰 등): 자동 감지된 PC IP 주소
// - 환경변수로 재정의 가능
const getApiBaseUrl = () => {
  // 환경변수가 설정되어 있으면 우선 사용
  if (process.env.API_BASE_URL) {
    console.log('✅ Using API_BASE_URL from env:', process.env.API_BASE_URL);
    return process.env.API_BASE_URL;
  }

  const LOCAL_IP = getLocalIP();
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  const isExpoGo = Constants.appOwnership === 'expo';

  let baseUrl;

  if (isAndroid) {
    // Android 에뮬레이터는 10.0.2.2로 호스트 접근
    baseUrl = 'http://10.0.2.2:5000/api/Wellsafer/v1';
  } else if (isIOS) {
    // iOS 실제 기기(아이폰)는 자동 감지된 로컬 IP 사용
    if (isExpoGo || __DEV__) {
      baseUrl = `http://${LOCAL_IP}:5000/api/Wellsafer/v1`;
    } else {
      baseUrl = 'http://localhost:5000/api/Wellsafer/v1';
    }
  } else {
    // 기타 플랫폼은 로컬 IP 사용
    baseUrl = `http://${LOCAL_IP}:5000/api/Wellsafer/v1`;
  }

  console.log('🌐 API Base URL:', baseUrl);
  return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 자동 추가
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Token load error:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 - 로그아웃 처리
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// ========== 인증 API ==========
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { user_id: username, password }),
  logout: () =>
    api.post('/auth/logout'),
};

// ========== 대시보드 API ==========
export const dashboardAPI = {
  // 대시보드 요약 (통계)
  getDashboard: () =>
    api.get('/dashboard'),
  // 최근 이벤트/알림 목록
  getEvents: (limit = 20) =>
    api.get(`/dashboard/events?limit=${limit}`),
  // 밴드 상태 요약 (센서 데이터 포함)
  getBandsStatus: () =>
    api.get('/dashboard/bands-status'),
  // 밴드 목록 (레거시)
  getBands: () =>
    api.get('/bands/list'),
  getBandDetail: (id) =>
    api.get(`/bands/${id}/detail`),
  getBandLocations: () =>
    api.get('/bands/locations'),
};

// ========== 밴드 API ==========
export const bandAPI = {
  getList: () =>
    api.get('/bands/list'),
  getDetail: (id) =>
    api.get(`/bands/${id}/detail`),
  getSensorData: (id, params) =>
    api.get(`/bands/${id}/sensor-data`, { params }),
};

// ========== 신경자극 API ==========
export const nerveStimAPI = {
  // 세션 목록 조회
  getSessions: (params) =>
    api.get('/nervestim/sessions', { params }),
  // 세션 상세 조회
  getSessionDetail: (sessionId) =>
    api.get(`/nervestim/sessions/${sessionId}`),
  // 세션 생성
  createSession: (data) =>
    api.post('/nervestim/sessions', data),
  // 세션 시작
  startSession: (sessionId, data) =>
    api.post(`/nervestim/sessions/${sessionId}/start`, data),
  // 세션 중지
  stopSession: (sessionId, data) =>
    api.post(`/nervestim/sessions/${sessionId}/stop`, data),
  // 세션 강도 변경
  changeLevel: (sessionId, level) =>
    api.put(`/nervestim/sessions/${sessionId}/level`, { level }),
  // 히스토리 조회
  getHistory: (params) =>
    api.get('/nervestim/history', { params }),
};

// ========== 혈압 API ==========
export const bloodPressureAPI = {
  getRecords: (params) =>
    api.get('/bloodpressure/records', { params }),
  addRecord: (data) =>
    api.post('/bloodpressure/records', data),
  deleteRecord: (id) =>
    api.delete(`/bloodpressure/records/${id}`),
};

// ========== 리포트 API ==========
export const reportAPI = {
  getList: () =>
    api.get('/reports'),
  getDetail: (id) =>
    api.get(`/reports/${id}`),
  generate: (data) =>
    api.post('/reports/generate', data),
  download: (id) =>
    api.get(`/reports/${id}/download`, { responseType: 'blob' }),
};

// ========== 기기 API ==========
export const deviceAPI = {
  getBands: () =>
    api.get('/devices/bands'),
  getStimulators: () =>
    api.get('/devices/stimulators'),
  getDeviceDetail: (id) =>
    api.get(`/devices/${id}`),
};

// ========== 사용자 API ==========
export const userAPI = {
  getList: () =>
    api.get('/users'),
  getDetail: (id) =>
    api.get(`/users/${id}`),
  update: (id, data) =>
    api.patch(`/users/${id}`, data),
};

// ========== API 상태 확인 ==========
export const statusAPI = {
  check: () =>
    api.get('/status'),
};

// API 베이스 URL 업데이트 함수 (설정에서 사용)
export const updateApiBaseUrl = (newUrl) => {
  api.defaults.baseURL = `${newUrl}/api`;
};

export default api;
