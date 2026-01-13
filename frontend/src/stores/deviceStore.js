/**
 * Device Store
 * 기기(밴드, 자극기) 관리
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { devicesAPI, bandsAPI } from '@/services/api'
import { useSocket } from '@/services/socket'

export const useDeviceStore = defineStore('device', () => {
  // State
  const bands = ref([])
  const stimulators = ref([])
  const selectedDevice = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Socket
  const { on, subscribeBand, unsubscribeBand } = useSocket()

  // Computed
  const onlineBands = computed(() => 
    bands.value.filter(b => b.status === 'online')
  )

  const offlineBands = computed(() => 
    bands.value.filter(b => b.status === 'offline')
  )

  const onlineStimulators = computed(() => 
    stimulators.value.filter(s => s.status === 'online')
  )

  const lowBatteryDevices = computed(() => 
    [...bands.value, ...stimulators.value].filter(d => (d.battery || 100) < 30)
  )

  const allDevices = computed(() => [
    ...bands.value.map(b => ({ ...b, deviceType: 'band' })),
    ...stimulators.value.map(s => ({ ...s, deviceType: 'stimulator' }))
  ])

  const deviceStats = computed(() => ({
    totalBands: bands.value.length,
    onlineBands: onlineBands.value.length,
    totalStimulators: stimulators.value.length,
    onlineStimulators: onlineStimulators.value.length,
    lowBattery: lowBatteryDevices.value.length
  }))

  // Actions
  async function fetchBands() {
    loading.value = true
    error.value = null
    try {
      const response = await devicesAPI.getBands()
      bands.value = response.data || []
      return bands.value
    } catch (err) {
      error.value = err.message
      console.error('[Device] Fetch bands error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchStimulators() {
    loading.value = true
    error.value = null
    try {
      const response = await devicesAPI.getStimulators()
      stimulators.value = response.data || []
      return stimulators.value
    } catch (err) {
      error.value = err.message
      console.error('[Device] Fetch stimulators error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchAllDevices() {
    loading.value = true
    error.value = null
    try {
      await Promise.all([fetchBands(), fetchStimulators()])
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateBand(bandId, data) {
    try {
      const response = await devicesAPI.updateDevice('bands', bandId, data)
      const index = bands.value.findIndex(b => b.id === bandId || b.bid === bandId)
      if (index !== -1) {
        bands.value[index] = { ...bands.value[index], ...response.data }
      }
      return response.data
    } catch (err) {
      console.error('[Device] Update band error:', err)
      throw err
    }
  }

  async function linkStimulator(stimId, bandId) {
    try {
      const response = await devicesAPI.linkStimulator(stimId, bandId)
      
      // 자극기 목록 업데이트
      const stimIndex = stimulators.value.findIndex(s => s.id === stimId)
      if (stimIndex !== -1) {
        stimulators.value[stimIndex].linked_band = bandId
      }
      
      return response.data
    } catch (err) {
      console.error('[Device] Link stimulator error:', err)
      throw err
    }
  }

  async function unlinkStimulator(stimId) {
    try {
      const response = await devicesAPI.unlinkStimulator(stimId)
      
      // 자극기 목록 업데이트
      const stimIndex = stimulators.value.findIndex(s => s.id === stimId)
      if (stimIndex !== -1) {
        stimulators.value[stimIndex].linked_band = null
      }
      
      return response.data
    } catch (err) {
      console.error('[Device] Unlink stimulator error:', err)
      throw err
    }
  }

  async function getBandLocations() {
    try {
      const response = await bandsAPI.getAllLocations()
      return response.data || []
    } catch (err) {
      console.error('[Device] Get locations error:', err)
      return []
    }
  }

  function selectDevice(device) {
    selectedDevice.value = device
  }

  function clearSelection() {
    selectedDevice.value = null
  }

  function getBandById(bandId) {
    return bands.value.find(b => b.bid === bandId || b.id === bandId)
  }

  function getStimulatorById(stimId) {
    return stimulators.value.find(s => s.stimulator_id === stimId || s.id === stimId)
  }

  function getStatusIcon(status) {
    return status === 'online' ? 'mdi-wifi' : 'mdi-wifi-off'
  }

  function getStatusColor(status) {
    return status === 'online' ? 'success' : 'grey'
  }

  function getBatteryIcon(level) {
    if (level >= 80) return 'mdi-battery-high'
    if (level >= 50) return 'mdi-battery-medium'
    if (level >= 20) return 'mdi-battery-low'
    return 'mdi-battery-alert'
  }

  function getBatteryColor(level) {
    if (level >= 50) return 'success'
    if (level >= 20) return 'warning'
    return 'error'
  }

  // 실시간 업데이트
  function updateBandData(data) {
    const index = bands.value.findIndex(b => b.bid === data.bid)
    if (index !== -1) {
      bands.value[index] = {
        ...bands.value[index],
        hr: data.hr,
        spo2: data.spo2,
        battery: data.battery,
        status: 'online',
        lastUpdate: data.timestamp
      }
    }
  }

  function updateBandLocation(data) {
    const index = bands.value.findIndex(b => b.bid === data.bid)
    if (index !== -1) {
      bands.value[index] = {
        ...bands.value[index],
        latitude: data.latitude,
        longitude: data.longitude
      }
    }
  }

  // Socket 리스너 설정
  function setupSocketListeners() {
    on('band_data', (data) => {
      updateBandData(data)
    })

    on('gps_data', (data) => {
      updateBandLocation(data)
    })

    on('event', (data) => {
      // 연결 상태 업데이트
      if (data.type === 7) { // 연결 끊김
        const index = bands.value.findIndex(b => b.bid === data.bid)
        if (index !== -1) {
          bands.value[index].status = 'offline'
        }
      }
    })
  }

  // 초기화
  function init() {
    setupSocketListeners()
  }

  return {
    // State
    bands,
    stimulators,
    selectedDevice,
    loading,
    error,
    // Computed
    onlineBands,
    offlineBands,
    onlineStimulators,
    lowBatteryDevices,
    allDevices,
    deviceStats,
    // Actions
    fetchBands,
    fetchStimulators,
    fetchAllDevices,
    updateBand,
    linkStimulator,
    unlinkStimulator,
    getBandLocations,
    selectDevice,
    clearSelection,
    getBandById,
    getStimulatorById,
    getStatusIcon,
    getStatusColor,
    getBatteryIcon,
    getBatteryColor,
    updateBandData,
    updateBandLocation,
    init
  }
})
