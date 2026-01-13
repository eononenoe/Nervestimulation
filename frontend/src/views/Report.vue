<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">건강 리포트</h1>
    </div>

    <!-- Loading -->
    <div v-if="reportStore.loading" class="loading-container">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <span>데이터 로딩중...</span>
    </div>

    <template v-else>
      <!-- Health Score Cards -->
      <v-row>
        <v-col cols="2">
          <v-card class="score-card total">
            <div class="score-value">{{ reportStore.healthScore.total }}</div>
            <div class="score-label">종합 점수</div>
          </v-card>
        </v-col>
        <v-col cols="2">
          <v-card class="score-card">
            <div class="score-value">{{ reportStore.healthScore.bp }}</div>
            <div class="score-label">혈압</div>
          </v-card>
        </v-col>
        <v-col cols="2">
          <v-card class="score-card">
            <div class="score-value">{{ reportStore.healthScore.hrv }}</div>
            <div class="score-label">HRV</div>
          </v-card>
        </v-col>
        <v-col cols="2">
          <v-card class="score-card">
            <div class="score-value">{{ reportStore.healthScore.activity }}</div>
            <div class="score-label">활동량</div>
          </v-card>
        </v-col>
        <v-col cols="2">
          <v-card class="score-card">
            <div class="score-value">{{ reportStore.healthScore.sleep }}</div>
            <div class="score-label">수면</div>
          </v-card>
        </v-col>
        <v-col cols="2">
          <v-btn color="primary" block @click="showGenerateDialog = true">
            <v-icon left>mdi-plus</v-icon>
            새 리포트
          </v-btn>
        </v-col>
      </v-row>

      <!-- Reports Table -->
      <v-row class="mt-4">
        <v-col cols="12">
          <v-card>
            <div class="ws-card-header">리포트 목록</div>
            <table class="ws-table" v-if="reportStore.reports.length > 0">
              <thead>
                <tr>
                  <th>리포트 ID</th>
                  <th>사용자</th>
                  <th>기간</th>
                  <th>건강점수</th>
                  <th>생성일</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="report in reportStore.reports" :key="report.id">
                  <td>{{ report.report_id || report.id }}</td>
                  <td>{{ report.user_name }}</td>
                  <td>{{ report.period_start }} ~ {{ report.period_end }}</td>
                  <td>
                    <span :style="{ color: getScoreColor(report.health_score), fontWeight: 700 }">
                      {{ report.health_score }}
                    </span>/100
                  </td>
                  <td>{{ formatDate(report.created_at) }}</td>
                  <td>
                    <v-btn variant="outlined" size="small" @click="viewReport(report)">보기</v-btn>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="no-data">리포트가 없습니다</div>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Generate Report Dialog -->
    <v-dialog v-model="showGenerateDialog" max-width="500">
      <v-card>
        <v-card-title>새 리포트 생성</v-card-title>
        <v-card-text>
          <v-select
            v-model="newReport.userId"
            :items="userOptions"
            item-title="text"
            item-value="value"
            label="사용자 선택"
            variant="outlined"
            class="mb-4"
          ></v-select>
          <v-select
            v-model="newReport.period"
            :items="['1주일', '2주일', '1개월']"
            label="기간"
            variant="outlined"
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showGenerateDialog = false">취소</v-btn>
          <v-btn color="primary" @click="generateReport" :loading="generating">생성</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useReportStore, useUserStore } from '@/store'

export default {
  name: 'ReportView',
  setup() {
    const reportStore = useReportStore()
    const userStore = useUserStore()

    const showGenerateDialog = ref(false)
    const generating = ref(false)
    const newReport = ref({
      userId: null,
      period: '1주일'
    })

    const userOptions = computed(() => {
      return userStore.users.map(user => ({
        text: user.name || user.user_name,
        value: user.id
      }))
    })

    const formatDate = (date) => {
      if (!date) return '-'
      return new Date(date).toLocaleDateString('ko-KR')
    }

    const getScoreColor = (score) => {
      if (score >= 80) return '#257E53'
      if (score >= 60) return '#f59e0b'
      return '#ef4444'
    }

    const viewReport = (report) => {
      // TODO: 리포트 상세 보기
      console.log('View report:', report)
    }

    const generateReport = async () => {
      if (!newReport.value.userId) return

      generating.value = true
      try {
        await reportStore.generateReport({
          user_id: newReport.value.userId,
          period: newReport.value.period
        })
        showGenerateDialog.value = false
        newReport.value = { userId: null, period: '1주일' }
        await reportStore.fetchReports()
      } catch (error) {
        console.error('Failed to generate report:', error)
      } finally {
        generating.value = false
      }
    }

    onMounted(async () => {
      await Promise.all([
        reportStore.fetchReports(),
        userStore.fetchUsers()
      ])
    })

    return {
      reportStore,
      showGenerateDialog,
      generating,
      newReport,
      userOptions,
      formatDate,
      getScoreColor,
      viewReport,
      generateReport
    }
  }
}
</script>

<style scoped>
.score-card {
  padding: 20px;
  text-align: center;
}

.score-card.total {
  background: linear-gradient(135deg, #257E53 0%, #1a5c3a 100%);
  color: white;
}

.score-card.total .score-value {
  color: white;
}

.score-value {
  font-size: 32px;
  font-weight: 700;
  color: #257E53;
}

.score-label {
  font-size: 12px;
  color: inherit;
  opacity: 0.8;
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
