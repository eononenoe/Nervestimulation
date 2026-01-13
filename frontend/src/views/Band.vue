<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">밴드 조회</h1>
      <div>
        <v-btn variant="outlined" class="mr-2" :color="viewMode === 'list' ? 'primary' : ''" @click="viewMode = 'list'">리스트</v-btn>
        <v-btn :color="viewMode === 'node' ? 'primary' : ''" variant="outlined" @click="viewMode = 'node'">노드</v-btn>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="bandStore.loading" class="loading-container">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <span>데이터 로딩중...</span>
    </div>

    <!-- List View -->
    <v-card v-else-if="viewMode === 'list'">
      <table class="ws-table" v-if="bandStore.bands.length > 0">
        <thead>
          <tr>
            <th>No.</th>
            <th>밴드 ID</th>
            <th>사용자</th>
            <th>상태</th>
            <th>심박수</th>
            <th>SpO2</th>
            <th>배터리</th>
            <th>마지막 연결</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(band, index) in bandStore.bands" :key="band.id || band.band_id" class="clickable" @click="openBandDetail(band)">
            <td>{{ index + 1 }}</td>
            <td>{{ band.band_id || band.id }}</td>
            <td>{{ band.user_name || band.user || '-' }}</td>
            <td>
              <span :class="['ws-chip', band.status === 'online' ? 'ws-chip-success' : 'ws-chip-grey']">
                {{ band.status === 'online' ? '연결' : '오프라인' }}
              </span>
            </td>
            <td>{{ band.status === 'online' ? (band.heart_rate || band.hr || '-') + ' BPM' : '-' }}</td>
            <td>{{ band.status === 'online' ? (band.spo2 || '-') : '-' }}</td>
            <td>
              <div class="d-flex align-center ga-2">
                <div class="battery-bar">
                  <div class="battery-fill" :style="{ width: `${band.battery || 0}%`, background: getBatteryColor(band.battery) }"></div>
                </div>
                <span :style="{ fontSize: '11px', color: (band.battery || 0) <= 20 ? '#ef4444' : 'inherit' }">{{ band.battery || 0 }}%</span>
              </div>
            </td>
            <td>{{ band.last_sync || band.lastSync || '-' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="no-data">등록된 밴드가 없습니다</div>
    </v-card>

    <!-- Node View (Map) -->
    <v-card v-else style="height: 70vh; position: relative;">
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
          <span>온라인</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #9ca3af;"></div>
          <span>오프라인</span>
        </div>
      </div>
    </v-card>
  </div>
</template>

<script>
import { ref, watch, inject, onMounted } from 'vue'
import { useBandStore } from '@/store'
import { createMap, createBandMarker, createAdminMarker, getCurrentPosition, assignBandPositions } from '@/plugins/leafletMap'

export default {
  name: 'BandView',
  setup() {
    const bandStore = useBandStore()
    const openBandDetail = inject('openBandDetail')

    const viewMode = ref('list')
    const mapContainer = ref(null)
    const mapLoading = ref(false)
    let map = null
    let currentPos = null

    const getBatteryColor = (battery) => {
      if (battery > 50) return '#10b981'
      if (battery > 20) return '#f59e0b'
      return '#ef4444'
    }

    const initMap = async () => {
      if (!mapContainer.value) return

      try {
        mapLoading.value = true

        // 기존 맵 제거
        if (map) {
          map.remove()
          map = null
        }

        // 현재 위치 가져오기
        currentPos = await getCurrentPosition()
        console.log('Band map center (PC location):', currentPos)

        map = createMap(mapContainer.value, {
          center: [currentPos.lat, currentPos.lng],
          zoom: 15
        })

        // 관리자 마커
        createAdminMarker(map, currentPos)

        // 밴드 마커 생성
        let bands = bandStore.bands

        if (bands.length > 0) {
          // 위치 정보가 없는 밴드는 현재 위치 주변에 배치
          bands = bands.map(band => {
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
          })
        }

        mapLoading.value = false
      } catch (error) {
        console.error('Failed to init map:', error)
        mapLoading.value = false
      }
    }

    // 페이지 로드시 데이터 가져오기
    onMounted(async () => {
      await bandStore.fetchBands()
      // 위치 미리 가져오기
      currentPos = await getCurrentPosition()
    })

    watch(viewMode, (newMode) => {
      if (newMode === 'node') {
        setTimeout(initMap, 100)
      }
    })

    return {
      viewMode,
      mapContainer,
      mapLoading,
      bandStore,
      getBatteryColor,
      openBandDetail
    }
  }
}
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 16px;
  color: #666;
}

.no-data {
  padding: 48px;
  text-align: center;
  color: #888;
  font-size: 14px;
}

.map-container { height: 100%; width: 100%; }

.map-legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 1000;
  font-size: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.legend-item:last-child { margin-bottom: 0; }

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.map-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.9);
  padding: 24px;
  border-radius: 12px;
}
</style>
