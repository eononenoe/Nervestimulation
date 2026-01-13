import { defineStore } from 'pinia'
import api from '@/plugins/api'

// Band Store
export const useBandStore = defineStore('band', {
  state: () => ({
    bands: [],
    selectedBand: null,
    loading: false
  }),
  actions: {
    async fetchBands() {
      this.loading = true
      try {
        const response = await api.get('/bands/')
        this.bands = response.data
      } catch (error) {
        console.error('Failed to fetch bands:', error)
      } finally {
        this.loading = false
      }
    },
    async fetchBandDetail(bandId) {
      try {
        const response = await api.get(`/bands/${bandId}/`)
        this.selectedBand = response.data
        return response.data
      } catch (error) {
        console.error('Failed to fetch band detail:', error)
      }
    },
    async fetchBandLocation(bandId) {
      try {
        const response = await api.get(`/bands/${bandId}/location/`)
        return response.data
      } catch (error) {
        console.error('Failed to fetch band location:', error)
      }
    }
  }
})

// Device Store
export const useDeviceStore = defineStore('device', {
  state: () => ({
    devices: [],
    stimulators: [],
    loading: false
  }),
  actions: {
    async fetchDevices() {
      this.loading = true
      try {
        const [bandsRes, stimRes] = await Promise.all([
          api.get('/devices/bands/'),
          api.get('/devices/stimulators/')
        ])
        this.devices = bandsRes.data
        this.stimulators = stimRes.data
      } catch (error) {
        console.error('Failed to fetch devices:', error)
      } finally {
        this.loading = false
      }
    },
    async registerDevice(deviceData) {
      try {
        const response = await api.post('/devices/', deviceData)
        return response.data
      } catch (error) {
        console.error('Failed to register device:', error)
        throw error
      }
    }
  }
})

// NerveStim Store
export const useNerveStimStore = defineStore('nervestim', {
  state: () => ({
    sessions: [],
    currentSession: null,
    stats: {
      todaySessions: 0,
      completedSessions: 0,
      avgBpReduction: 0,
      inProgress: 0
    },
    loading: false
  }),
  actions: {
    async fetchSessions() {
      this.loading = true
      try {
        const response = await api.get('/nervestim/sessions/')
        this.sessions = response.data.sessions || response.data || []
        if (response.data.stats) {
          this.stats = response.data.stats
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error)
      } finally {
        this.loading = false
      }
    },
    async startSession(params) {
      try {
        const response = await api.post('/nervestim/sessions/', params)
        this.currentSession = response.data
        this.sessions.unshift(response.data)
        return response.data
      } catch (error) {
        console.error('Failed to start session:', error)
        throw error
      }
    },
    async stopSession(sessionId, data = {}) {
      try {
        const response = await api.patch(`/nervestim/sessions/${sessionId}/stop/`, data)
        this.currentSession = null
        return response.data
      } catch (error) {
        console.error('Failed to stop session:', error)
        throw error
      }
    }
  }
})

// Blood Pressure Store
export const useBloodPressureStore = defineStore('bloodpressure', {
  state: () => ({
    records: [],
    stats: {
      avgBp: '0/0',
      stabilityIndex: 0,
      measureCount: 0,
      stimEffect: 0
    },
    chartData: [],
    loading: false
  }),
  actions: {
    async fetchRecords(days = 7) {
      this.loading = true
      try {
        const response = await api.get(`/bloodpressure/records/?days=${days}`)
        this.records = response.data.records || []
        if (response.data.stats) {
          this.stats = response.data.stats
        }
        if (response.data.chartData) {
          this.chartData = response.data.chartData
        }
      } catch (error) {
        console.error('Failed to fetch BP records:', error)
      } finally {
        this.loading = false
      }
    },
    async addRecord(record) {
      try {
        const response = await api.post('/bloodpressure/records/', record)
        this.records.unshift(response.data)
        return response.data
      } catch (error) {
        console.error('Failed to add BP record:', error)
        throw error
      }
    }
  }
})

// Report Store
export const useReportStore = defineStore('report', {
  state: () => ({
    reports: [],
    healthScore: {
      total: 0,
      bp: 0,
      hrv: 0,
      activity: 0,
      sleep: 0
    },
    loading: false
  }),
  actions: {
    async fetchReports() {
      this.loading = true
      try {
        const response = await api.get('/reports/')
        this.reports = response.data.reports || []
        if (response.data.healthScore) {
          this.healthScore = response.data.healthScore
        }
      } catch (error) {
        console.error('Failed to fetch reports:', error)
      } finally {
        this.loading = false
      }
    },
    async generateReport(params) {
      try {
        const response = await api.post('/reports/generate/', params)
        this.reports.unshift(response.data)
        return response.data
      } catch (error) {
        console.error('Failed to generate report:', error)
        throw error
      }
    }
  }
})

// User Store
export const useUserStore = defineStore('user', {
  state: () => ({
    users: [],
    currentUser: null,
    loading: false
  }),
  actions: {
    async fetchUsers() {
      this.loading = true
      try {
        const response = await api.get('/users/')
        this.users = response.data
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        this.loading = false
      }
    },
    async addUser(userData) {
      try {
        const response = await api.post('/users/', userData)
        this.users.push(response.data)
        return response.data
      } catch (error) {
        console.error('Failed to add user:', error)
        throw error
      }
    },
    async login(credentials) {
      try {
        const response = await api.post('/auth/login/', credentials)
        localStorage.setItem('token', response.data.token)
        this.currentUser = response.data.user
        return response.data
      } catch (error) {
        console.error('Login failed:', error)
        throw error
      }
    },
    logout() {
      localStorage.removeItem('token')
      this.currentUser = null
    }
  }
})

// Dashboard Store
export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    alerts: [],
    events: [],
    weeklyStats: [],
    bandLocations: [],
    loading: false
  }),
  actions: {
    async fetchDashboardData() {
      this.loading = true
      try {
        const response = await api.get('/dashboard/')
        this.alerts = response.data.alerts || []
        this.events = response.data.events || []
        this.weeklyStats = response.data.weeklyStats || []
        this.bandLocations = response.data.bandLocations || []
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        this.loading = false
      }
    }
  }
})
