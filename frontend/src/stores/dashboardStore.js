/**
 * Dashboard Store
 * 대시보드 데이터 관리
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dashboardAPI } from '@/services/api'
import { useSocket } from '@/services/socket'

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const alerts = ref([])
  const events = ref([])
  const weeklyStats = ref([])
  const bandLocations = ref([])
  const loading = ref(false)
  const error = ref(null)
  const lastUpdate = ref(null)

  // Socket
  const { on, subscribeAlerts } = useSocket()

  // Computed
  const activeAlerts = computed(() => 
    alerts.value.filter(a => !a.dismissed)
  )

  const criticalAlerts = computed(() => 
    alerts.value.filter(a => a.level === 'danger')
  )

  const warningAlerts = computed(() => 
    alerts.value.filter(a => a.level === 'warning')
  )

  const totalEvents = computed(() => 
    weeklyStats.value.reduce((sum, day) => sum + (day.count || 0), 0)
  )

  const onlineBandsCount = computed(() => 
    bandLocations.value.filter(b => b.status === 'online').length
  )

  // Actions
  async function fetchDashboard() {
    loading.value = true
    error.value = null
    try {
      const response = await dashboardAPI.getData()
      const data = response.data
      
      alerts.value = data.alerts || []
      events.value = data.events || []
      weeklyStats.value = data.weeklyStats || []
      bandLocations.value = data.bandLocations || []
      lastUpdate.value = new Date()
      
      return data
    } catch (err) {
      error.value = err.message
      console.error('[Dashboard] Fetch error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchAlerts() {
    try {
      const response = await dashboardAPI.getAlerts()
      alerts.value = response.data || []
      return alerts.value
    } catch (err) {
      console.error('[Dashboard] Fetch alerts error:', err)
      throw err
    }
  }

  async function fetchEvents(params = {}) {
    try {
      const response = await dashboardAPI.getEvents(params)
      events.value = response.data || []
      return events.value
    } catch (err) {
      console.error('[Dashboard] Fetch events error:', err)
      throw err
    }
  }

  async function fetchStats() {
    try {
      const response = await dashboardAPI.getStats()
      weeklyStats.value = response.data.weeklyStats || []
      return response.data
    } catch (err) {
      console.error('[Dashboard] Fetch stats error:', err)
      throw err
    }
  }

  function addAlert(alert) {
    alerts.value.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...alert
    })
    
    // 최대 20개 유지
    if (alerts.value.length > 20) {
      alerts.value = alerts.value.slice(0, 20)
    }
  }

  function dismissAlert(alertId) {
    const index = alerts.value.findIndex(a => a.id === alertId)
    if (index !== -1) {
      alerts.value[index].dismissed = true
    }
  }

  function clearAlerts() {
    alerts.value = []
  }

  function addEvent(event) {
    events.value.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...event
    })
    
    // 최대 50개 유지
    if (events.value.length > 50) {
      events.value = events.value.slice(0, 50)
    }
  }

  function updateBandLocation(data) {
    const index = bandLocations.value.findIndex(b => b.band_id === data.bid)
    if (index !== -1) {
      bandLocations.value[index] = {
        ...bandLocations.value[index],
        latitude: data.latitude,
        longitude: data.longitude
      }
    }
  }

  function getAlertIcon(level) {
    const icons = {
      danger: 'mdi-alert-circle',
      warning: 'mdi-alert',
      info: 'mdi-information',
      success: 'mdi-check-circle'
    }
    return icons[level] || 'mdi-bell'
  }

  function getAlertColor(level) {
    const colors = {
      danger: 'error',
      warning: 'warning',
      info: 'info',
      success: 'success'
    }
    return colors[level] || 'grey'
  }

  // Socket 리스너 설정
  function setupSocketListeners() {
    on('alert', (data) => {
      addAlert({
        userName: data.user_name,
        message: data.message,
        level: data.type <= 3 ? 'danger' : 'warning',
        band: { bid: data.bid }
      })
    })

    on('event', (data) => {
      addEvent({
        userName: data.user_name,
        message: data.type_display,
        value: data.value,
        band: { bid: data.bid }
      })
    })

    on('gps_data', (data) => {
      updateBandLocation(data)
    })
  }

  // 주기적 업데이트
  let refreshInterval = null

  function startAutoRefresh(intervalMs = 30000) {
    stopAutoRefresh()
    refreshInterval = setInterval(() => {
      fetchDashboard().catch(console.error)
    }, intervalMs)
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  // 초기화
  function init() {
    setupSocketListeners()
    subscribeAlerts()
  }

  return {
    // State
    alerts,
    events,
    weeklyStats,
    bandLocations,
    loading,
    error,
    lastUpdate,
    // Computed
    activeAlerts,
    criticalAlerts,
    warningAlerts,
    totalEvents,
    onlineBandsCount,
    // Actions
    fetchDashboard,
    fetchAlerts,
    fetchEvents,
    fetchStats,
    addAlert,
    dismissAlert,
    clearAlerts,
    addEvent,
    updateBandLocation,
    getAlertIcon,
    getAlertColor,
    startAutoRefresh,
    stopAutoRefresh,
    init
  }
})
