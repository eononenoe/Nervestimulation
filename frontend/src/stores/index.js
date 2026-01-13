/**
 * Wellsafer Pinia Stores
 * 중앙 스토어 관리
 */
import { createPinia } from 'pinia'

// Stores
export { useAuthStore } from './authStore'
export { useNerveStimStore } from './nerveStimStore'
export { useBloodPressureStore } from './bloodPressureStore'
export { useDeviceStore } from './deviceStore'
export { useReportStore } from './reportStore'
export { useDashboardStore } from './dashboardStore'

// Pinia 인스턴스 생성
const pinia = createPinia()

// 스토어 초기화 함수
export function initStores() {
  const { useNerveStimStore, useDeviceStore, useDashboardStore } = require('./index')
  
  // 소켓 리스너 초기화
  const nerveStimStore = useNerveStimStore()
  const deviceStore = useDeviceStore()
  const dashboardStore = useDashboardStore()
  
  nerveStimStore.init()
  deviceStore.init()
  dashboardStore.init()
}

export default pinia
