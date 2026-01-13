/**
 * Blood Pressure Store
 * 혈압 기록 관리
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { bloodpressureAPI } from '@/services/api'

export const useBloodPressureStore = defineStore('bloodPressure', () => {
  // State
  const records = ref([])
  const stats = ref({
    avgBp: '128/82',
    stabilityIndex: 78,
    measureCount: 0,
    stimEffect: -8
  })
  const chartData = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Computed
  const latestRecord = computed(() => {
    if (records.value.length === 0) return null
    return records.value[0]
  })

  const normalCount = computed(() => 
    records.value.filter(r => r.status === '정상').length
  )

  const warningCount = computed(() => 
    records.value.filter(r => r.status === '주의').length
  )

  const highCount = computed(() => 
    records.value.filter(r => r.status?.includes('고혈압')).length
  )

  const averageSystolic = computed(() => {
    if (records.value.length === 0) return 0
    const sum = records.value.reduce((acc, r) => acc + (r.systolic || 0), 0)
    return Math.round(sum / records.value.length)
  })

  const averageDiastolic = computed(() => {
    if (records.value.length === 0) return 0
    const sum = records.value.reduce((acc, r) => acc + (r.diastolic || 0), 0)
    return Math.round(sum / records.value.length)
  })

  // Actions
  async function fetchRecords(days = 7) {
    loading.value = true
    error.value = null
    try {
      const response = await bloodpressureAPI.getRecords({ days })
      records.value = response.data.records || []
      
      if (response.data.stats) {
        stats.value = response.data.stats
      }
      
      if (response.data.chartData) {
        chartData.value = response.data.chartData
      }
      
      return records.value
    } catch (err) {
      error.value = err.message
      console.error('[BloodPressure] Fetch records error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addRecord(data) {
    loading.value = true
    error.value = null
    try {
      const response = await bloodpressureAPI.addRecord(data)
      const newRecord = response.data
      records.value.unshift(newRecord)
      
      // 통계 업데이트
      stats.value.measureCount++
      
      return newRecord
    } catch (err) {
      error.value = err.message
      console.error('[BloodPressure] Add record error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchStats(params = {}) {
    try {
      const response = await bloodpressureAPI.getStats(params)
      stats.value = response.data
      return stats.value
    } catch (err) {
      console.error('[BloodPressure] Fetch stats error:', err)
    }
  }

  async function fetchTrend(userId, days = 30) {
    try {
      const response = await bloodpressureAPI.getTrend(userId, days)
      return response.data
    } catch (err) {
      console.error('[BloodPressure] Fetch trend error:', err)
      throw err
    }
  }

  function getStatusColor(status) {
    const colors = {
      '정상': 'success',
      '주의': 'warning',
      '고혈압 1기': 'orange',
      '고혈압 2기': 'error'
    }
    return colors[status] || 'grey'
  }

  function getBpCategory(systolic, diastolic) {
    if (systolic < 120 && diastolic < 80) return '정상'
    if (systolic < 130 && diastolic < 85) return '주의'
    if (systolic < 140 && diastolic < 90) return '경계'
    if (systolic < 160 && diastolic < 100) return '고혈압 1기'
    return '고혈압 2기'
  }

  function clearRecords() {
    records.value = []
    chartData.value = []
  }

  return {
    // State
    records,
    stats,
    chartData,
    loading,
    error,
    // Computed
    latestRecord,
    normalCount,
    warningCount,
    highCount,
    averageSystolic,
    averageDiastolic,
    // Actions
    fetchRecords,
    addRecord,
    fetchStats,
    fetchTrend,
    getStatusColor,
    getBpCategory,
    clearRecords
  }
})
