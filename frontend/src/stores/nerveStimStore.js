/**
 * Nerve Stimulation Store
 * 신경자극 세션 관리
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nervestimAPI } from '@/services/api'
import { useSocket } from '@/services/socket'

export const useNerveStimStore = defineStore('nerveStim', () => {
  // State
  const sessions = ref([])
  const currentSession = ref(null)
  const stats = ref({
    todaySessions: 0,
    completedSessions: 0,
    avgBpReduction: 0,
    inProgress: 0
  })
  const protocols = ref([
    { id: 1, name: '혈압 강하', description: '정중/척골신경 자극을 통한 혈압 강하', frequency: 25, intensity: 2.5, duration: 15 },
    { id: 2, name: '혈류 안정화', description: '혈류 개선 및 안정화', frequency: 30, intensity: 2.0, duration: 20 },
    { id: 3, name: '통증 완화', description: '만성 통증 완화', frequency: 100, intensity: 3.0, duration: 30 }
  ])
  const loading = ref(false)
  const error = ref(null)

  // Socket
  const { on, sendStimCommand } = useSocket()

  // Computed
  const activeSessions = computed(() => 
    sessions.value.filter(s => s.status === '진행중')
  )

  const completedSessions = computed(() => 
    sessions.value.filter(s => s.status === '완료')
  )

  const todaySessions = computed(() => {
    const today = new Date().toDateString()
    return sessions.value.filter(s => 
      new Date(s.start_time).toDateString() === today
    )
  })

  // Actions
  async function fetchSessions(params = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await nervestimAPI.getSessions(params)
      sessions.value = response.data.sessions || response.data || []
      if (response.data.stats) {
        stats.value = response.data.stats
      }
      return sessions.value
    } catch (err) {
      error.value = err.message
      console.error('[NerveStim] Fetch sessions error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function startSession(data) {
    loading.value = true
    error.value = null
    try {
      const response = await nervestimAPI.createSession(data)
      const newSession = response.data
      sessions.value.unshift(newSession)
      currentSession.value = newSession
      
      // Socket으로 자극 시작 명령
      if (data.band_id) {
        await sendStimCommand(data.band_id, 'start', {
          frequency: data.frequency,
          intensity: data.intensity,
          duration: data.duration
        })
      }
      
      stats.value.todaySessions++
      stats.value.inProgress++
      
      return newSession
    } catch (err) {
      error.value = err.message
      console.error('[NerveStim] Start session error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function stopSession(sessionId, data = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await nervestimAPI.stopSession(sessionId, data)
      const updatedSession = response.data
      
      // 세션 목록 업데이트
      const index = sessions.value.findIndex(s => s.id === sessionId)
      if (index !== -1) {
        sessions.value[index] = updatedSession
      }
      
      if (currentSession.value?.id === sessionId) {
        currentSession.value = updatedSession
      }
      
      // Socket으로 자극 중지 명령
      if (updatedSession.band_id) {
        await sendStimCommand(updatedSession.band_id, 'stop', {
          bp_after: data.bp_after
        })
      }
      
      stats.value.completedSessions++
      stats.value.inProgress = Math.max(0, stats.value.inProgress - 1)
      
      return updatedSession
    } catch (err) {
      error.value = err.message
      console.error('[NerveStim] Stop session error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    try {
      const response = await nervestimAPI.getStats()
      stats.value = response.data
      return stats.value
    } catch (err) {
      console.error('[NerveStim] Fetch stats error:', err)
    }
  }

  function setCurrentSession(session) {
    currentSession.value = session
  }

  function clearCurrentSession() {
    currentSession.value = null
  }

  // Socket 이벤트 리스너
  function setupSocketListeners() {
    on('stim_update', (data) => {
      console.log('[NerveStim] Stim update:', data)
      
      if (data.action === 'stop' && currentSession.value) {
        currentSession.value.status = '완료'
        currentSession.value.end_time = data.timestamp
      }
    })
  }

  // 초기화
  function init() {
    setupSocketListeners()
  }

  return {
    // State
    sessions,
    currentSession,
    stats,
    protocols,
    loading,
    error,
    // Computed
    activeSessions,
    completedSessions,
    todaySessions,
    // Actions
    fetchSessions,
    startSession,
    stopSession,
    fetchStats,
    setCurrentSession,
    clearCurrentSession,
    init
  }
})
