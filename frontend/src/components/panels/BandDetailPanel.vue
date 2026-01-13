<template>
  <v-navigation-drawer
    :model-value="modelValue"
    location="right"
    temporary
    width="480"
    class="detail-panel"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- Header -->
    <div class="detail-header">
      <h2>{{ band?.user_name || band?.user }} - {{ band?.band_id || band?.id }}</h2>
      <v-btn icon variant="text" @click="$emit('close')">
        <v-icon color="white">mdi-close</v-icon>
      </v-btn>
    </div>

    <!-- Body -->
    <div class="detail-body" v-if="band">
      <!-- 기본 정보 -->
      <div class="detail-section">
        <div class="detail-section-title">기본 정보</div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">밴드 ID</div>
            <div class="detail-info-value">{{ band.band_id || band.id }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">사용자</div>
            <div class="detail-info-value">{{ band.user_name || band.user }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">IMEI</div>
            <div class="detail-info-value">{{ band.imei }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">펌웨어</div>
            <div class="detail-info-value">{{ band.firmware || 'v2.1.4' }}</div>
          </div>
        </div>
      </div>

      <!-- 실시간 생체신호 -->
      <div class="detail-section">
        <div class="detail-section-title">실시간 생체신호</div>
        <v-row>
          <v-col cols="4">
            <div class="vital-card" :class="hrClass">
              <div class="vital-icon">❤️</div>
              <div class="vital-value">{{ band.status === 'online' ? (band.heart_rate || band.hr || '-') : '-' }}</div>
              <div class="vital-label">심박수 (BPM)</div>
            </div>
          </v-col>
          <v-col cols="4">
            <div class="vital-card">
              <div class="vital-icon">💨</div>
              <div class="vital-value">{{ band.status === 'online' ? (band.spo2 || '-') : '-' }}</div>
              <div class="vital-label">SpO2</div>
            </div>
          </v-col>
          <v-col cols="4">
            <div class="vital-card" :class="bpClass">
              <div class="vital-icon">🩺</div>
              <div class="vital-value">{{ band.status === 'online' ? (band.blood_pressure || band.bp || '-') : '-' }}</div>
              <div class="vital-label">혈압</div>
            </div>
          </v-col>
        </v-row>
        <div class="detail-info-grid mt-3">
          <div class="detail-info-item">
            <div class="detail-info-label">HRV</div>
            <div class="detail-info-value">{{ band.hrv || '-' }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">스트레스</div>
            <div class="detail-info-value">{{ band.stress || '-' }}</div>
          </div>
        </div>
      </div>

      <!-- 기기 상태 -->
      <div class="detail-section">
        <div class="detail-section-title">기기 상태</div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">연결</div>
            <div class="detail-info-value">
              <span :class="['ws-chip', band.status === 'online' ? 'ws-chip-success' : 'ws-chip-grey']">
                {{ band.status === 'online' ? '연결됨' : '오프라인' }}
              </span>
            </div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">배터리</div>
            <div class="detail-info-value">
              <div class="d-flex align-center ga-2">
                <div class="battery-bar" style="width: 80px;">
                  <div 
                    class="battery-fill" 
                    :style="{ 
                      width: `${band.battery}%`, 
                      background: batteryColor 
                    }"
                  ></div>
                </div>
                <span>{{ band.battery }}%</span>
              </div>
            </div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">신호</div>
            <div class="detail-info-value">{{ band.signal || '-65 dBm (양호)' }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">동기화</div>
            <div class="detail-info-value">{{ band.last_sync || band.sync || '방금 전' }}</div>
          </div>
        </div>
      </div>

      <!-- 연결된 신경자극기 -->
      <div class="detail-section">
        <div class="detail-section-title">연결된 신경자극기</div>
        <div v-if="band.stimulator" class="stimulator-info">
          <div class="stimulator-header">
            <div class="stimulator-icon">⚡</div>
            <div>
              <div style="font-weight: 600;">{{ band.stimulator.id }}</div>
              <div style="font-size: 11px; color: #666;">MAC: {{ band.stimulator.mac }}</div>
            </div>
            <span class="ws-chip ws-chip-success" style="margin-left: auto;">연결됨</span>
          </div>
          <div class="stimulator-details">
            <div>배터리: {{ band.stimulator.battery }}%</div>
            <div>오늘 세션: {{ band.stimulator.sessions }}회</div>
            <div>마지막 자극: {{ band.stimulator.lastStim }}</div>
            <div>프로토콜: {{ band.stimulator.protocol }}</div>
          </div>
        </div>
        <div v-else class="text-center pa-5 text-grey">
          연결된 신경자극기가 없습니다
        </div>
      </div>

      <!-- 위치 정보 -->
      <div class="detail-section">
        <div class="detail-section-title">위치 정보</div>
        <div ref="mapContainer" class="detail-map-container" style="height: 200px;"></div>
        <div class="detail-info-grid mt-3">
          <div class="detail-info-item">
            <div class="detail-info-label">좌표</div>
            <div class="detail-info-value" style="font-size: 13px;">
              {{ formatCoords(band.latitude, band.longitude) }}
            </div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">위치 유형</div>
            <div class="detail-info-value">{{ band.location_type || '실외 (GPS)' }}</div>
          </div>
        </div>
      </div>

      <!-- 최근 활동 -->
      <div class="detail-section">
        <div class="detail-section-title">최근 활동</div>
        <div class="activity-list">
          <div 
            v-for="(activity, index) in band.activities || defaultActivities" 
            :key="index" 
            class="activity-item"
          >
            <div :class="['activity-dot', activity.type]"></div>
            <div class="activity-time">{{ activity.time }}</div>
            <div class="activity-text">{{ activity.text }}</div>
          </div>
        </div>
      </div>

      <!-- 액션 버튼 -->
      <div class="d-flex ga-3 mt-5">
        <v-btn color="primary" block @click="startStimulation">신경자극 시작</v-btn>
        <v-btn variant="outlined" color="primary" block @click="generateReport">리포트 생성</v-btn>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script>
import { ref, computed, watch, inject } from 'vue'
import { createMap, createBandMarker } from '@/plugins/leafletMap'

export default {
  name: 'BandDetailPanel',
  props: {
    modelValue: Boolean,
    band: Object
  },
  emits: ['update:modelValue', 'close'],
  setup(props, { emit }) {
    const showToast = inject('showToast')
    const mapContainer = ref(null)
    let map = null

    const defaultActivities = [
      { time: '16:30', text: '신경자극 세션 완료', type: 'success' },
      { time: '16:15', text: '혈압 상승 감지', type: 'warning' },
      { time: '16:00', text: '신경자극 세션 시작', type: 'success' }
    ]

    const hrClass = computed(() => {
      const hr = props.band?.heart_rate || props.band?.hr || 0
      if (hr > 120) return 'danger'
      if (hr > 100) return 'warning'
      return ''
    })

    const bpClass = computed(() => {
      const bp = props.band?.blood_pressure || props.band?.bp || ''
      const systolic = parseInt(bp.split('/')[0]) || 0
      if (systolic >= 160) return 'danger'
      if (systolic >= 140) return 'warning'
      return ''
    })

    const batteryColor = computed(() => {
      const battery = props.band?.battery || 0
      if (battery > 50) return '#10b981'
      if (battery > 20) return '#f59e0b'
      return '#ef4444'
    })

    const formatCoords = (lat, lng) => {
      if (!lat || !lng) return '36.1194, 128.3446'
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }

    const initMap = () => {
      if (!mapContainer.value || !props.band) return

      try {
        // 기존 맵 제거
        if (map) {
          map.remove()
          map = null
        }

        const position = [
          props.band.latitude || 36.1194,
          props.band.longitude || 128.3446
        ]

        map = createMap(mapContainer.value, {
          center: position,
          zoom: 16
        })

        createBandMarker(map, props.band)
      } catch (error) {
        console.error('Failed to init map:', error)
      }
    }

    watch(() => props.modelValue, (newVal) => {
      if (newVal) {
        setTimeout(initMap, 300)
      }
    })

    const startStimulation = () => {
      showToast('신경자극 세션을 시작합니다', 'success')
      emit('close')
    }

    const generateReport = () => {
      showToast('리포트 생성 중...', 'success')
      emit('close')
    }

    return {
      mapContainer,
      defaultActivities,
      hrClass,
      bpClass,
      batteryColor,
      formatCoords,
      startStimulation,
      generateReport
    }
  }
}
</script>

<style scoped>
.detail-panel {
  z-index: 2000 !important;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #257E53;
  color: white;
}

.detail-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.detail-body {
  padding: 20px;
}

.detail-map-container {
  border-radius: 8px;
  overflow: hidden;
}
</style>
