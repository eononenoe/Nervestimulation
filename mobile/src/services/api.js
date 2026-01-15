import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 환경변수 또는 기본값 사용
// adb reverse tcp:5000 tcp:5000 실행 후 localhost 사용 가능
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/Wellsafer/v1';

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
    api.post('/auth/login', { username, password }),
  logout: () =>
    api.post('/auth/logout'),
};

// ========== 대시보드 API ==========
export const dashboardAPI = {
  getDashboard: () =>
    api.get('/dashboard'),
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
  getSessions: (params) =>
    api.get('/nervestim/sessions', { params }),
  getSessionDetail: (id) =>
    api.get(`/nervestim/sessions/${id}`),
  startSession: (data) =>
    api.post('/nervestim/sessions', data),
  stopSession: (id, data) =>
    api.patch(`/nervestim/sessions/${id}/stop`, data),
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
