<template>
  <div>
    <!-- Top Row -->
    <v-row>
      <!-- Time Card -->
      <v-col cols="3">
        <v-card class="time-card">
          <div class="time-date">{{ currentDate }}</div>
          <div class="time-clock">{{ currentTime }}</div>
        </v-card>
      </v-col>

      <!-- Weather Card -->
      <v-col cols="5">
        <v-card class="weather-card">
          <div class="weather-main">
            <div class="weather-icon">{{ weatherIcon }}</div>
            <div>
              <div class="weather-temp">{{ weather.temp }}°C</div>
              <div class="weather-desc">{{ weather.desc }} | 체감온도 {{ weather.feelsLike }}°C</div>
            </div>
          </div>
          <div class="weather-details">
            <div class="weather-detail-item">
              <div class="weather-detail-value">{{ weather.humidity }}%</div>
              <div class="weather-detail-label">습도</div>
            </div>
            <div class="weather-detail-item">
              <div class="weather-detail-value">{{ weather.wind }}m/s</div>
              <div class="weather-detail-label">풍속</div>
            </div>
            <div class="weather-detail-item">
              <div class="weather-detail-value">{{ weather.dust }}</div>
              <div class="weather-detail-label">미세먼지</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Alerts Card -->
      <v-col cols="4">
        <v-card class="alerts-card" style="height: 30vh;">
          <div class="ws-card-header">생체 신호 이상 감지</div>
          <div class="alerts-list">
            <template v-if="dashboardStore.alerts.length > 0">
              <div 
                v-for="alert in dashboardStore.alerts" 
                :key="alert.id" 
                class="alert-item"
                @click="openBandDetailById(alert.band_id)"
              >
                <div :class="['alert-dot', alert.level]"></div>
                <div style="flex: 1;">
                  <div style="font-weight: 500; font-size: 13px;">{{ alert.user_name }}</div>
                  <div style="font-size: 11px; color: #666;">{{ alert.message }}</div>
                </div>
                <span :class="['ws-chip', alert.level === 'danger' ? 'ws-chip-error' : 'ws-chip-warning']">
                  {{ alert.level === 'danger' ? '위험' : '주의' }}
                </span>
              </div>
            </template>
            <div v-else class="no-data">알림이 없습니다</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Map Row -->
    <v-row>
      <v-col cols="12">
        <v-card style="height: 40vh; position: relative;">
          <div v-if="mapLoading" class="map-loading">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <span>지도 로딩중...</span>
          </div>
          <div ref="mapContainer" class="map-container" style="height: 100%;"></div>
          <div class="map-legend">
            <div class="legend-item">
              <div class="legend-dot" style="background: #1e40af;"></div>
              <span>관리자 위치</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot" style="background: #10b981;"></div>
              <span>밴드 (온라인)</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot" style="background: #9ca3af;"></div>
              <span>밴드 (오프라인)</span>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Bottom Row -->
    <v-row>
      <!-- Events -->
      <v-col cols="6">
        <v-card style="height: 25vh;">
          <div class="ws-card-header">이벤트 이력</div>
          <div style="overflow-y: auto; max-height: calc(100% - 45px);">
            <table class="ws-table" v-if="dashboardStore.events.length > 0">
              <thead>
                <tr><th>이름</th><th>이벤트</th><th></th></tr>
              </thead>
              <tbody>
                <tr 
                  v-for="event in dashboardStore.events" 
                  :key="event.id" 
                  class="clickable"
                  @click="openBandDetailById(event.band_id)"
                >
                  <td>{{ event.user_name }}</td>
                  <td>{{ event.message }}</td>
                  <td>{{ event.value }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="no-data">이벤트가 없습니다</div>
          </div>
        </v-card>
      </v-col>

      <!-- Weekly Chart -->
      <v-col cols="6">
        <v-card style="height: 25vh;">
          <div class="ws-card-header">일주일간 생체신호 이상 건수</div>
          <div class="chart-container">
            <canvas ref="chartCanvas"></canvas>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, inject } from 'vue'
import { useDashboardStore, useBandStore } from '@/store'
import { createMap, createBandMarker, createAdminMarker, getCurrentPosition, assignBandPositions } from '@/plugins/leafletMap'
import Chart from 'chart.js/auto'

export default {
  name: 'DashboardView',
  setup() {
    const dashboardStore = useDashboardStore()
    const bandStore = useBandStore()
    const openBandDetail = inject('openBandDetail')

    // Time
    const currentDate = ref('')
    const currentTime = ref('')
    let timeInterval = null

    const updateTime = () => {
      const now = new Date()
      const days = ['일', '월', '화', '수', '목', '금', '토']
      currentDate.value = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`
      currentTime.value = now.toLocaleTimeString('ko-KR', { hour12: false })
    }

    // Weather
    const weather = ref({
      temp: '--',
      desc: '로딩중...',
      feelsLike: '--',
      humidity: '--',
      wind: '--',
      dust: '-'
    })
    const weatherIcon = ref('🌡️')

    const getWeatherInfo = (code) => {
      const weatherMap = {
        0: { desc: '맑음', icon: '☀️' },
        1: { desc: '대체로 맑음', icon: '🌤️' },
        2: { desc: '부분 흐림', icon: '⛅' },
        3: { desc: '흐림', icon: '☁️' },
        45: { desc: '안개', icon: '🌫️' },
        48: { desc: '짙은 안개', icon: '🌫️' },
        51: { desc: '가벼운 이슬비', icon: '🌦️' },
        53: { desc: '이슬비', icon: '🌦️' },
        55: { desc: '강한 이슬비', icon: '🌧️' },
        61: { desc: '약한 비', icon: '🌧️' },
        63: { desc: '비', icon: '🌧️' },
        65: { desc: '강한 비', icon: '🌧️' },
        66: { desc: '약한 진눈깨비', icon: '🌨️' },
        67: { desc: '진눈깨비', icon: '🌨️' },
        71: { desc: '약한 눈', icon: '🌨️' },
        73: { desc: '눈', icon: '❄️' },
        75: { desc: '강한 눈', icon: '❄️' },
        77: { desc: '싸락눈', icon: '🌨️' },
        80: { desc: '소나기', icon: '🌦️' },
        81: { desc: '소나기', icon: '🌧️' },
        82: { desc: '강한 소나기', icon: '⛈️' },
        85: { desc: '눈 소나기', icon: '🌨️' },
        86: { desc: '강한 눈 소나기', icon: '❄️' },
        95: { desc: '뇌우', icon: '⛈️' },
        96: { desc: '우박 뇌우', icon: '⛈️' },
        99: { desc: '강한 우박 뇌우', icon: '⛈️' }
      }
      return weatherMap[code] || { desc: '알 수 없음', icon: '🌡️' }
    }

    const fetchWeather = async (lat, lng) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia/Seoul`
        const response = await fetch(url)
        const data = await response.json()

        if (data.current) {
          const current = data.current
          const weatherInfo = getWeatherInfo(current.weather_code)

          weather.value = {
            temp: Math.round(current.temperature_2m),
            desc: weatherInfo.desc,
            feelsLike: Math.round(current.apparent_temperature),
            humidity: current.relative_humidity_2m,
            wind: current.wind_speed_10m.toFixed(1),
            dust: '-'
          }
          weatherIcon.value = weatherInfo.icon
        }
      } catch (error) {
        console.error('Failed to fetch weather:', error)
        weather.value = {
          temp: '--',
          desc: '날씨 정보 없음',
          feelsLike: '--',
          humidity: '--',
          wind: '--',
          dust: '-'
        }
      }
    }

    // Map
    const mapContainer = ref(null)
    const mapLoading = ref(true)
    let map = null
    const bandMarkers = []
    let currentPos = null

    const initMap = async () => {
      try {
        mapLoading.value = true

        // 현재 위치 가져오기
        currentPos = await getCurrentPosition()
        console.log('Map center (PC location):', currentPos)

        // 날씨 가져오기
        await fetchWeather(currentPos.lat, currentPos.lng)

        // 대시보드 데이터 로드
        await dashboardStore.fetchDashboardData()

        // 밴드 데이터 로드
        await bandStore.fetchBands()

        map = createMap(mapContainer.value, {
          center: [currentPos.lat, currentPos.lng],
          zoom: 15
        })

        // 관리자 마커
        createAdminMarker(map, currentPos)

        // 밴드 마커 생성
        loadBandMarkers()

        mapLoading.value = false
      } catch (error) {
        console.error('Failed to init map:', error)
        mapLoading.value = false
      }
    }

    const loadBandMarkers = () => {
      if (!map || !currentPos) return

      // 기존 마커 제거
      bandMarkers.forEach(marker => map.removeLayer(marker))
      bandMarkers.length = 0

      let bands = bandStore.bands

      if (bands.length > 0) {
        // 위치 정보가 없는 밴드는 현재 위치 주변에 배치
        bands = bands.map((band, index) => {
          if (!band.latitude || !band.longitude) {
            const pos = assignBandPositions([band], currentPos)[0]
            return { ...band, latitude: pos.latitude, longitude: pos.longitude }
          }
          return band
        })

        bands.forEach(band => {
          const marker = createBandMarker(map, band)
          marker.on('click', () => {
            openBandDetail(band)
          })
          bandMarkers.push(marker)
        })
      }
    }

    const openBandDetailById = async (bandId) => {
      if (!bandId) return
      const band = bandStore.bands.find(b => b.id === bandId || b.band_id === bandId)
      if (band) {
        openBandDetail(band)
      } else {
        const bandData = await bandStore.fetchBandDetail(bandId)
        if (bandData) {
          openBandDetail(bandData)
        }
      }
    }

    // Chart
    const chartCanvas = ref(null)
    let chartInstance = null

    const initChart = () => {
      if (!chartCanvas.value) return

      const stats = dashboardStore.weeklyStats
      const labels = stats.length > 0 
        ? stats.map(s => s.date) 
        : getLast7Days()
      const data = stats.length > 0 
        ? stats.map(s => s.count) 
        : [0, 0, 0, 0, 0, 0, 0]

      chartInstance = new Chart(chartCanvas.value, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: '이상 건수',
            data: data,
            backgroundColor: '#43E396',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
            x: { grid: { display: false } }
          }
        }
      })
    }

    const getLast7Days = () => {
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        days.push(`${d.getMonth() + 1}/${d.getDate()}`)
      }
      return days
    }

    onMounted(async () => {
      updateTime()
      timeInterval = setInterval(updateTime, 1000)
      await initMap()
      initChart()
    })

    onUnmounted(() => {
      if (timeInterval) clearInterval(timeInterval)
      if (chartInstance) chartInstance.destroy()
      if (map) map.remove()
    })

    return {
      currentDate,
      currentTime,
      weather,
      weatherIcon,
      dashboardStore,
      mapContainer,
      mapLoading,
      chartCanvas,
      openBandDetailById
    }
  }
}
</script>

<style scoped>
.time-card {
  background: linear-gradient(135deg, #257E53 0%, #1a5c3a 100%);
  color: white;
  padding: 20px;
  height: 30vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.time-date { font-size: 14px; opacity: 0.9; margin-bottom: 8px; }
.time-clock { font-size: 36px; font-weight: 700; font-family: 'Roboto Mono', monospace; }

.weather-card { padding: 16px; height: 30vh; }
.weather-main { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.weather-icon { font-size: 48px; }
.weather-temp { font-size: 32px; font-weight: 700; color: #257E53; }
.weather-desc { color: #666; font-size: 13px; }
.weather-details { display: flex; gap: 24px; }
.weather-detail-item { text-align: center; }
.weather-detail-value { font-size: 18px; font-weight: 600; color: #333; }
.weather-detail-label { font-size: 11px; color: #888; }

.alerts-card { overflow: hidden; }
.alerts-list { max-height: calc(100% - 45px); overflow-y: auto; }
.alert-item { display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid #f5f5f5; gap: 12px; cursor: pointer; transition: background 0.2s; }
.alert-item:hover { background: #f0fdf4; }
.alert-dot { width: 10px; height: 10px; border-radius: 50%; }
.alert-dot.danger { background: #ef4444; }
.alert-dot.warning { background: #f59e0b; }

.map-container { height: 100%; width: 100%; }
.map-legend { position: absolute; bottom: 16px; left: 16px; background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1000; font-size: 12px; }
.legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.legend-item:last-child { margin-bottom: 0; }
.legend-dot { width: 12px; height: 12px; border-radius: 50%; }

.map-loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1001; display: flex; flex-direction: column; align-items: center; gap: 12px; background: rgba(255,255,255,0.9); padding: 24px; border-radius: 12px; }

.chart-container { height: calc(100% - 45px); padding: 8px; }

.no-data { padding: 24px; text-align: center; color: #888; font-size: 13px; }
</style>
