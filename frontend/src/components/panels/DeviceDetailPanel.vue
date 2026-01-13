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
      <h2>{{ panelTitle }}</h2>
      <v-btn icon variant="text" @click="$emit('close')">
        <v-icon color="white">mdi-close</v-icon>
      </v-btn>
    </div>

    <!-- Body - Band Type -->
    <div class="detail-body" v-if="device && deviceType === 'band'">
      <!-- 기본 정보 -->
      <div class="detail-section">
        <div class="detail-section-title">기본 정보</div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">기기 ID</div>
            <div class="detail-info-value">{{ device.band_id || device.id }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">사용자</div>
            <div class="detail-info-value">{{ device.user_name || device.user || '미배정' }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">IMEI</div>
            <div class="detail-info-value">{{ device.imei }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">펌웨어</div>
            <div class="detail-info-value">{{ device.firmware || 'v2.1.4' }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">연결 방식</div>
            <div class="detail-info-value">LTE-M (Cat.M1)</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">시리얼</div>
            <div class="detail-info-value">{{ device.serial || 'SN-BAND-000001' }}</div>
          </div>
        </div>
      </div>

      <!-- 기기 상태 -->
      <div class="detail-section">
        <div class="detail-section-title">기기 상태</div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">연결 상태</div>
            <div class="detail-info-value">
              <span :class="['ws-chip', device.status === 'online' ? 'ws-chip-success' : 'ws-chip-grey']">
                {{ device.status === 'online' ? '온라인' : '오프라인' }}
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
                    :style="{ width: `${device.battery}%`, background: batteryColor }"
                  ></div>
                </div>
                <span>{{ device.battery }}%</span>
              </div>
            </div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">신호 강도</div>
            <div class="detail-info-value">{{ device.signal || '-65 dBm (양호)' }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">마지막 동기화</div>
            <div class="detail-info-value">{{ device.last_sync || '방금 전' }}</div>
          </div>
        </div>
      </div>

      <!-- 센서 정보 -->
      <div class="detail-section">
        <div class="detail-section-title">센서 정보</div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">PPG 센서</div>
            <div class="detail-info-value"><span class="ws-chip ws-chip-success">정상</span></div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">IMU 센서</div>
            <div class="detail-info-value"><span class="ws-chip ws-chip-success">정상</span></div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">GPS</div>
            <div class="detail-info-value"><span class="ws-chip ws-chip-success">정상</span></div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">LTE-M</div>
            <div class="detail-info-value"><span class="ws-chip ws-chip-success">정상</span></div>
          </div>
        </div>
      </div>

      <!-- 현재 위치 -->
      <div class="detail-section">
        <div class="detail-section-title">현재 위치</div>
        <div ref="mapContainer" class="detail-map-container" style="height: 200px;"></div>
      </div>

      <!-- 액션 버튼 -->
      <div class="d-flex ga-3 mt-5">
        <v-btn color="primary" block @click="updateFirmware">펌웨어 업데이트</v-btn>
        <v-btn variant="outlined" color="warning" block @click="restartDevice">원격 재시작</v-btn>
      </div>
    </div>

    <!-- Body - Stimulator Type -->
    <div class="detail-body" v-else-if="device && deviceType === 'stim'">
      <!-- 기본 정보 -->
      <div class="detail-section">
        <div class="detail-section-title">기본 정보</div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">기기 ID</div>
            <div class="detail-info-value">{{ device.stimulator_id || device.id }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">MAC 주소</div>
            <div class="detail-info-value">{{ device.mac }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">펌웨어</div>
            <div class="detail-info-value">{{ device.firmware || 'v1.5.2' }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">연결 방식</div>
            <div class="detail-info-value">BLE 5.0</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">시리얼</div>
            <div class="detail-info-value">{{ device.serial || 'SN-STIM-000001' }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">프로토콜</div>
            <div class="detail-info-value">{{ device.protocol || '혈압 강하' }}</div>
          </div>
        </div>
      </div>

      <!-- 기기 상태 -->
      <div class="detail-section">
        <div class="detail-section-title">기기 상태</div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">연결 상태</div>
            <div class="detail-info-value">
              <span :class="['ws-chip', device.status === 'online' ? 'ws-chip-success' : 'ws-chip-grey']">
                {{ device.status === 'online' ? '온라인' : '오프라인' }}
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
                    :style="{ width: `${device.battery}%`, background: batteryColor }"
                  ></div>
                </div>
                <span>{{ device.battery }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 연결된 밴드 -->
      <div class="detail-section">
        <div class="detail-section-title">연결된 밴드</div>
        <div v-if="device.linked_band" class="stimulator-info">
          <div class="stimulator-header">
            <div class="stimulator-icon" style="background: #43E396;">⌚</div>
            <div>
              <div style="font-weight: 600;">{{ device.linked_band }}</div>
              <div style="font-size: 11px; color: #666;">{{ device.user_name || device.user }}</div>
            </div>
            <span class="ws-chip ws-chip-success" style="margin-left: auto;">연결됨</span>
          </div>
        </div>
        <div v-else class="text-center pa-5 text-grey">
          연결된 밴드가 없습니다
        </div>
      </div>

      <!-- 세션 통계 -->
      <div class="detail-section">
        <div class="detail-section-title">세션 통계</div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">총 세션 수</div>
            <div class="detail-info-value">{{ device.total_sessions || 24 }}회</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">마지막 세션</div>
            <div class="detail-info-value">{{ device.last_session || '2024-12-22 16:30' }}</div>
          </div>
        </div>
      </div>

      <!-- 전극 상태 -->
      <div class="detail-section">
        <div class="detail-section-title">전극 상태</div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">정중신경 전극</div>
            <div class="detail-info-value"><span class="ws-chip ws-chip-success">정상</span></div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">척골신경 전극</div>
            <div class="detail-info-value"><span class="ws-chip ws-chip-success">정상</span></div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">접촉 임피던스</div>
            <div class="detail-info-value">1.2 kΩ</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">출력 보정</div>
            <div class="detail-info-value"><span class="ws-chip ws-chip-success">완료</span></div>
          </div>
        </div>
      </div>

      <!-- 액션 버튼 -->
      <div class="d-flex ga-3 mt-5">
        <v-btn color="primary" block @click="updateFirmware">펌웨어 업데이트</v-btn>
        <v-btn variant="outlined" color="primary" block @click="calibrateElectrode">전극 보정</v-btn>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script>
import { ref, computed, watch, inject } from 'vue'
import { createMap, createBandMarker } from '@/plugins/leafletMap'

export default {
  name: 'DeviceDetailPanel',
  props: {
    modelValue: Boolean,
    device: Object,
    deviceType: {
      type: String,
      default: 'band'
    }
  },
  emits: ['update:modelValue', 'close'],
  setup(props, { emit }) {
    const showToast = inject('showToast')
    const mapContainer = ref(null)
    let map = null

    const panelTitle = computed(() => {
      if (!props.device) return ''
      if (props.deviceType === 'band') {
        return `스마트밴드 - ${props.device.band_id || props.device.id}`
      }
      return `신경자극기 - ${props.device.stimulator_id || props.device.id}`
    })

    const batteryColor = computed(() => {
      const battery = props.device?.battery || 0
      if (battery > 50) return '#10b981'
      if (battery > 20) return '#f59e0b'
      return '#ef4444'
    })

    const initMap = () => {
      if (!mapContainer.value || !props.device || props.deviceType !== 'band') return

      try {
        // 기존 맵 제거
        if (map) {
          map.remove()
          map = null
        }

        const position = [
          props.device.latitude || 36.1194,
          props.device.longitude || 128.3446
        ]

        map = createMap(mapContainer.value, {
          center: position,
          zoom: 16
        })

        createBandMarker(map, props.device)
      } catch (error) {
        console.error('Failed to init map:', error)
      }
    }

    watch(() => props.modelValue, (newVal) => {
      if (newVal && props.deviceType === 'band') {
        setTimeout(initMap, 300)
      }
    })

    const updateFirmware = () => {
      showToast('펌웨어 업데이트 확인 중...', 'success')
    }

    const restartDevice = () => {
      showToast('기기 재시작 명령 전송', 'warning')
    }

    const calibrateElectrode = () => {
      showToast('전극 보정 시작', 'success')
    }

    return {
      mapContainer,
      panelTitle,
      batteryColor,
      updateFirmware,
      restartDevice,
      calibrateElectrode
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
