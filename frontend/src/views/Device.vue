<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">기기 관리</h1>
    </div>

    <!-- Loading -->
    <div v-if="deviceStore.loading" class="loading-container">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <span>데이터 로딩중...</span>
    </div>

    <template v-else>
      <v-row>
        <!-- Smart Bands -->
        <v-col cols="6">
          <v-card>
            <div class="ws-card-header">
              <span>스마트밴드</span>
              <v-btn color="primary" size="small" @click="showAddBandDialog = true">
                + 등록
              </v-btn>
            </div>
            <table class="ws-table" v-if="deviceStore.devices.length > 0">
              <thead>
                <tr><th>기기 ID</th><th>사용자</th><th>상태</th><th>배터리</th></tr>
              </thead>
              <tbody>
                <tr v-for="device in deviceStore.devices" :key="device.id" class="clickable" @click="openDeviceDetail(device, 'band')">
                  <td>{{ device.device_id || device.id }}</td>
                  <td>{{ device.user_name || '-' }}</td>
                  <td>
                    <span :class="['ws-chip', device.status === 'online' ? 'ws-chip-success' : 'ws-chip-grey']">
                      {{ device.status === 'online' ? '온라인' : '오프라인' }}
                    </span>
                  </td>
                  <td>{{ device.battery || 0 }}%</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="no-data">등록된 스마트밴드가 없습니다</div>
          </v-card>
        </v-col>

        <!-- Nerve Stimulators -->
        <v-col cols="6">
          <v-card>
            <div class="ws-card-header">
              <span>신경자극기</span>
              <v-btn color="primary" size="small" @click="showAddStimDialog = true">
                + 등록
              </v-btn>
            </div>
            <table class="ws-table" v-if="deviceStore.stimulators.length > 0">
              <thead>
                <tr><th>기기 ID</th><th>연결 밴드</th><th>상태</th><th>배터리</th></tr>
              </thead>
              <tbody>
                <tr v-for="stim in deviceStore.stimulators" :key="stim.id" class="clickable" @click="openDeviceDetail(stim, 'stimulator')">
                  <td>{{ stim.device_id || stim.id }}</td>
                  <td>{{ stim.connected_band || '-' }}</td>
                  <td>
                    <span :class="['ws-chip', stim.status === 'online' ? 'ws-chip-success' : (stim.status === 'disconnected' ? 'ws-chip-grey' : 'ws-chip-grey')]">
                      {{ getStimStatus(stim.status) }}
                    </span>
                  </td>
                  <td>{{ stim.battery || 0 }}%</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="no-data">등록된 신경자극기가 없습니다</div>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Add Band Dialog -->
    <v-dialog v-model="showAddBandDialog" max-width="500">
      <v-card>
        <v-card-title>스마트밴드 등록</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newBand.deviceId"
            label="기기 ID"
            variant="outlined"
            class="mb-4"
          ></v-text-field>
          <v-text-field
            v-model="newBand.imei"
            label="IMEI"
            variant="outlined"
            class="mb-4"
          ></v-text-field>
          <v-select
            v-model="newBand.userId"
            :items="userOptions"
            item-title="text"
            item-value="value"
            label="사용자 배정"
            variant="outlined"
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showAddBandDialog = false">취소</v-btn>
          <v-btn color="primary" @click="registerBand" :loading="registering">등록</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Stimulator Dialog -->
    <v-dialog v-model="showAddStimDialog" max-width="500">
      <v-card>
        <v-card-title>신경자극기 등록</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newStim.deviceId"
            label="기기 ID"
            variant="outlined"
            class="mb-4"
          ></v-text-field>
          <v-text-field
            v-model="newStim.mac"
            label="MAC 주소"
            variant="outlined"
            class="mb-4"
          ></v-text-field>
          <v-select
            v-model="newStim.bandId"
            :items="bandOptions"
            item-title="text"
            item-value="value"
            label="연결할 밴드"
            variant="outlined"
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showAddStimDialog = false">취소</v-btn>
          <v-btn color="primary" @click="registerStimulator" :loading="registering">등록</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, computed, inject, onMounted } from 'vue'
import { useDeviceStore, useUserStore } from '@/store'

export default {
  name: 'DeviceView',
  setup() {
    const deviceStore = useDeviceStore()
    const userStore = useUserStore()
    const openDeviceDetail = inject('openDeviceDetail')

    const showAddBandDialog = ref(false)
    const showAddStimDialog = ref(false)
    const registering = ref(false)

    const newBand = ref({ deviceId: '', imei: '', userId: null })
    const newStim = ref({ deviceId: '', mac: '', bandId: null })

    const userOptions = computed(() => {
      return userStore.users.map(user => ({
        text: user.name || user.user_name,
        value: user.id
      }))
    })

    const bandOptions = computed(() => {
      return deviceStore.devices.map(device => ({
        text: device.device_id || device.id,
        value: device.id
      }))
    })

    const getStimStatus = (status) => {
      switch (status) {
        case 'online': return '온라인'
        case 'disconnected': return '미연결'
        default: return '오프라인'
      }
    }

    const registerBand = async () => {
      registering.value = true
      try {
        await deviceStore.registerDevice({
          type: 'band',
          device_id: newBand.value.deviceId,
          imei: newBand.value.imei,
          user_id: newBand.value.userId
        })
        showAddBandDialog.value = false
        newBand.value = { deviceId: '', imei: '', userId: null }
        await deviceStore.fetchDevices()
      } catch (error) {
        console.error('Failed to register band:', error)
      } finally {
        registering.value = false
      }
    }

    const registerStimulator = async () => {
      registering.value = true
      try {
        await deviceStore.registerDevice({
          type: 'stimulator',
          device_id: newStim.value.deviceId,
          mac: newStim.value.mac,
          band_id: newStim.value.bandId
        })
        showAddStimDialog.value = false
        newStim.value = { deviceId: '', mac: '', bandId: null }
        await deviceStore.fetchDevices()
      } catch (error) {
        console.error('Failed to register stimulator:', error)
      } finally {
        registering.value = false
      }
    }

    onMounted(async () => {
      await Promise.all([
        deviceStore.fetchDevices(),
        userStore.fetchUsers()
      ])
    })

    return {
      deviceStore,
      showAddBandDialog,
      showAddStimDialog,
      registering,
      newBand,
      newStim,
      userOptions,
      bandOptions,
      getStimStatus,
      registerBand,
      registerStimulator,
      openDeviceDetail
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
</style>
