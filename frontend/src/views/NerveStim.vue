<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">신경자극 관리</h1>
    </div>

    <!-- Loading -->
    <div v-if="nerveStimStore.loading" class="loading-container">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <span>데이터 로딩중...</span>
    </div>

    <template v-else>
      <!-- Stats Cards -->
      <v-row>
        <v-col cols="3">
          <v-card class="stat-card">
            <div class="stat-value">{{ nerveStimStore.stats.todaySessions }}</div>
            <div class="stat-label">오늘 세션</div>
          </v-card>
        </v-col>
        <v-col cols="3">
          <v-card class="stat-card">
            <div class="stat-value">{{ nerveStimStore.stats.inProgress }}</div>
            <div class="stat-label">진행 중</div>
          </v-card>
        </v-col>
        <v-col cols="3">
          <v-card class="stat-card">
            <div class="stat-value">{{ nerveStimStore.stats.avgBpReduction }}</div>
            <div class="stat-label">평균 혈압 변화</div>
          </v-card>
        </v-col>
        <v-col cols="3">
          <v-card class="stat-card">
            <div class="stat-value">{{ successRate }}%</div>
            <div class="stat-label">성공률</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Sessions Table -->
      <v-row class="mt-4">
        <v-col cols="12">
          <v-card>
            <div class="ws-card-header">
              <span>세션 기록</span>
              <v-btn color="primary" size="small" @click="showNewSessionDialog = true">
                + 새 세션
              </v-btn>
            </div>
            <table class="ws-table" v-if="nerveStimStore.sessions.length > 0">
              <thead>
                <tr>
                  <th>세션 ID</th>
                  <th>사용자</th>
                  <th>프로토콜</th>
                  <th>시작 시간</th>
                  <th>혈압 (전→후)</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="session in nerveStimStore.sessions" :key="session.id">
                  <td>{{ session.session_id || session.id }}</td>
                  <td>{{ session.user_name }}</td>
                  <td>{{ session.protocol }}</td>
                  <td>{{ formatTime(session.start_time) }}</td>
                  <td>{{ session.bp_before || '-' }} → {{ session.bp_after || '-' }}</td>
                  <td>
                    <span :class="['ws-chip', getStatusClass(session.status)]">
                      {{ getStatusText(session.status) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="no-data">세션 기록이 없습니다</div>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- New Session Dialog -->
    <v-dialog v-model="showNewSessionDialog" max-width="500">
      <v-card>
        <v-card-title>새 신경자극 세션</v-card-title>
        <v-card-text>
          <v-select
            v-model="newSession.bandId"
            :items="bandOptions"
            item-title="text"
            item-value="value"
            label="밴드 선택"
            variant="outlined"
            class="mb-4"
          ></v-select>
          <v-select
            v-model="newSession.protocol"
            :items="protocolOptions"
            label="프로토콜"
            variant="outlined"
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showNewSessionDialog = false">취소</v-btn>
          <v-btn color="primary" @click="startNewSession" :loading="starting">시작</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useNerveStimStore, useBandStore } from '@/store'

export default {
  name: 'NerveStimView',
  setup() {
    const nerveStimStore = useNerveStimStore()
    const bandStore = useBandStore()

    const showNewSessionDialog = ref(false)
    const starting = ref(false)
    const newSession = ref({
      bandId: null,
      protocol: '혈압 강하'
    })

    const protocolOptions = ['혈압 강하', '혈류 안정화', '통증 완화', '신경 재생']

    const bandOptions = computed(() => {
      return bandStore.bands.map(band => ({
        text: `${band.user_name || band.user || '사용자'} (${band.band_id || band.id})`,
        value: band.id || band.band_id
      }))
    })

    const successRate = computed(() => {
      const stats = nerveStimStore.stats
      if (stats.todaySessions === 0) return 0
      return Math.round((stats.completedSessions / stats.todaySessions) * 100)
    })

    const formatTime = (time) => {
      if (!time) return '-'
      const date = new Date(time)
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }

    const getStatusClass = (status) => {
      switch (status) {
        case 'completed': return 'ws-chip-success'
        case 'in_progress': return 'ws-chip-warning'
        case 'failed': return 'ws-chip-error'
        default: return 'ws-chip-grey'
      }
    }

    const getStatusText = (status) => {
      switch (status) {
        case 'completed': return '완료'
        case 'in_progress': return '진행중'
        case 'failed': return '실패'
        default: return status
      }
    }

    const startNewSession = async () => {
      if (!newSession.value.bandId) return

      starting.value = true
      try {
        await nerveStimStore.startSession({
          band_id: newSession.value.bandId,
          protocol: newSession.value.protocol
        })
        showNewSessionDialog.value = false
        newSession.value = { bandId: null, protocol: '혈압 강하' }
        await nerveStimStore.fetchSessions()
      } catch (error) {
        console.error('Failed to start session:', error)
      } finally {
        starting.value = false
      }
    }

    onMounted(async () => {
      await Promise.all([
        nerveStimStore.fetchSessions(),
        bandStore.fetchBands()
      ])
    })

    return {
      nerveStimStore,
      showNewSessionDialog,
      starting,
      newSession,
      protocolOptions,
      bandOptions,
      successRate,
      formatTime,
      getStatusClass,
      getStatusText,
      startNewSession
    }
  }
}
</script>

<style scoped>
.stat-card {
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #257E53;
}

.stat-label {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
}

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
