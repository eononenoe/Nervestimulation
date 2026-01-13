/**
 * Report Store
 * 건강 리포트 관리
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { reportsAPI } from '@/services/api'

export const useReportStore = defineStore('report', () => {
  // State
  const reports = ref([])
  const healthScore = ref({
    total: 0,
    bp: 0,
    hrv: 0,
    activity: 0,
    sleep: 0
  })
  const currentReport = ref(null)
  const loading = ref(false)
  const generating = ref(false)
  const error = ref(null)

  // Computed
  const recentReports = computed(() => 
    reports.value.slice(0, 5)
  )

  const reportsByType = computed(() => {
    const grouped = {}
    reports.value.forEach(r => {
      if (!grouped[r.type]) {
        grouped[r.type] = []
      }
      grouped[r.type].push(r)
    })
    return grouped
  })

  const averageScore = computed(() => {
    if (reports.value.length === 0) return 0
    const sum = reports.value.reduce((acc, r) => acc + (r.score || 0), 0)
    return Math.round(sum / reports.value.length)
  })

  // Actions
  async function fetchReports(params = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await reportsAPI.getAll(params)
      reports.value = response.data.reports || []
      
      if (response.data.healthScore) {
        healthScore.value = response.data.healthScore
      }
      
      return reports.value
    } catch (err) {
      error.value = err.message
      console.error('[Report] Fetch reports error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchReportById(id) {
    loading.value = true
    error.value = null
    try {
      const response = await reportsAPI.getById(id)
      currentReport.value = response.data
      return currentReport.value
    } catch (err) {
      error.value = err.message
      console.error('[Report] Fetch report error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function generateReport(data) {
    generating.value = true
    error.value = null
    try {
      const response = await reportsAPI.generate(data)
      const newReport = response.data
      reports.value.unshift(newReport)
      return newReport
    } catch (err) {
      error.value = err.message
      console.error('[Report] Generate report error:', err)
      throw err
    } finally {
      generating.value = false
    }
  }

  async function downloadReport(id) {
    try {
      const response = await reportsAPI.download(id)
      
      // Blob 다운로드 처리
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `health_report_${id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      return true
    } catch (err) {
      console.error('[Report] Download report error:', err)
      throw err
    }
  }

  async function deleteReport(id) {
    try {
      await reportsAPI.delete(id)
      reports.value = reports.value.filter(r => r.id !== id)
      
      if (currentReport.value?.id === id) {
        currentReport.value = null
      }
      
      return true
    } catch (err) {
      console.error('[Report] Delete report error:', err)
      throw err
    }
  }

  function setCurrentReport(report) {
    currentReport.value = report
  }

  function clearCurrentReport() {
    currentReport.value = null
  }

  function getScoreColor(score) {
    if (score >= 80) return 'success'
    if (score >= 60) return 'warning'
    return 'error'
  }

  function getScoreLabel(score) {
    if (score >= 80) return '양호'
    if (score >= 60) return '보통'
    return '주의 필요'
  }

  return {
    // State
    reports,
    healthScore,
    currentReport,
    loading,
    generating,
    error,
    // Computed
    recentReports,
    reportsByType,
    averageScore,
    // Actions
    fetchReports,
    fetchReportById,
    generateReport,
    downloadReport,
    deleteReport,
    setCurrentReport,
    clearCurrentReport,
    getScoreColor,
    getScoreLabel
  }
})
