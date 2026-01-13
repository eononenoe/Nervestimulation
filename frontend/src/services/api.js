/**
 * Wellsafer API Service
 * 백엔드 API 통신 모듈
 */
import axios from 'axios'

// API 기본 설정
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Axios 인스턴스
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 요청 인터셉터 - 토큰 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wellsafer_token')
    if (token) {
      config.headers.Authorization = `Token ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('wellsafer_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ============== Auth API ==============
export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login/', { username, password }),
  
  logout: () => 
    api.post('/auth/logout/'),
  
  checkAuth: () => 
    api.get('/auth/check/')
}

// ============== Users API ==============
export const usersAPI = {
  getAll: () => 
    api.get('/users/'),
  
  getById: (id) => 
    api.get(`/users/${id}/`),
  
  create: (data) => 
    api.post('/users/', data),
  
  update: (id, data) => 
    api.put(`/users/${id}/`, data),
  
  delete: (id) => 
    api.delete(`/users/${id}/`)
}

// ============== Bands API ==============
export const bandsAPI = {
  getAll: () => 
    api.get('/bands/'),
  
  getById: (id) => 
    api.get(`/bands/${id}/`),
  
  getLocation: (id) => 
    api.get(`/bands/${id}/location/`),
  
  getAllLocations: () => 
    api.get('/bands/locations/'),
  
  create: (data) => 
    api.post('/bands/', data),
  
  update: (id, data) => 
    api.put(`/bands/${id}/`, data),
  
  delete: (id) => 
    api.delete(`/bands/${id}/`)
}

// ============== Devices API ==============
export const devicesAPI = {
  getBands: () => 
    api.get('/devices/bands/'),
  
  getStimulators: () => 
    api.get('/devices/stimulators/'),
  
  getAll: () => 
    api.get('/devices/all/'),
  
  updateDevice: (type, id, data) => 
    api.put(`/devices/${type}/${id}/`, data),
  
  linkStimulator: (stimId, bandId) => 
    api.post(`/devices/stimulators/${stimId}/link/`, { band_id: bandId }),
  
  unlinkStimulator: (stimId) => 
    api.post(`/devices/stimulators/${stimId}/unlink/`)
}

// ============== Nerve Stimulation API ==============
export const nervestimAPI = {
  getSessions: (params = {}) => 
    api.get('/nervestim/sessions/', { params }),
  
  getSessionById: (id) => 
    api.get(`/nervestim/sessions/${id}/`),
  
  createSession: (data) => 
    api.post('/nervestim/sessions/', data),
  
  stopSession: (id, data = {}) => 
    api.patch(`/nervestim/sessions/${id}/stop/`, data),
  
  getStats: () => 
    api.get('/nervestim/stats/'),
  
  getProtocols: () => 
    api.get('/nervestim/protocols/')
}

// ============== Blood Pressure API ==============
export const bloodpressureAPI = {
  getRecords: (params = { days: 7 }) => 
    api.get('/bloodpressure/records/', { params }),
  
  addRecord: (data) => 
    api.post('/bloodpressure/records/', data),
  
  getStats: (params = {}) => 
    api.get('/bloodpressure/stats/', { params }),
  
  getTrend: (userId, days = 30) => 
    api.get(`/bloodpressure/trend/${userId}/`, { params: { days } })
}

// ============== Reports API ==============
export const reportsAPI = {
  getAll: (params = {}) => 
    api.get('/reports/', { params }),
  
  getById: (id) => 
    api.get(`/reports/${id}/`),
  
  generate: (data) => 
    api.post('/reports/generate/', data),
  
  download: (id) => 
    api.get(`/reports/${id}/download/`, { responseType: 'blob' }),
  
  delete: (id) => 
    api.delete(`/reports/${id}/`)
}

// ============== Dashboard API ==============
export const dashboardAPI = {
  getData: () => 
    api.get('/dashboard/'),
  
  getAlerts: () => 
    api.get('/dashboard/alerts/'),
  
  getEvents: (params = {}) => 
    api.get('/dashboard/events/', { params }),
  
  getStats: () => 
    api.get('/dashboard/stats/')
}

// ============== Settings API ==============
export const settingsAPI = {
  get: () => 
    api.get('/settings/'),
  
  update: (data) => 
    api.put('/settings/', data),
  
  getSmsConfig: () => 
    api.get('/settings/sms/'),
  
  updateSmsConfig: (data) => 
    api.put('/settings/sms/', data)
}

// Default export
export default api
