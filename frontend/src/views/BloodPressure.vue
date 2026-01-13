<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">혈압 관리</h1>
    </div>

    <!-- Loading -->
    <div v-if="bpStore.loading" class="loading-container">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <span>데이터 로딩중...</span>
    </div>

    <template v-else>
      <!-- Stats Cards -->
      <v-row>
        <v-col cols="3">
          <v-card class="stat-card">
            <div class="stat-value">{{ bpStore.stats.avgBp }}</div>
            <div class="stat-label">평균 혈압</div>
          </v-card>
        </v-col>
        <v-col cols="3">
          <v-card class="stat-card">
            <div class="stat-value">{{ bpStore.stats.stabilityIndex }}</div>
            <div class="stat-label">안정화 지수</div>
          </v-card>
        </v-col>
        <v-col cols="3">
          <v-card class="stat-card">
            <div class="stat-value">{{ bpStore.stats.measureCount }}</div>
            <div class="stat-label">측정 횟수</div>
          </v-card>
        </v-col>
        <v-col cols="3">
          <v-card class="stat-card">
            <div class="stat-value">{{ bpStore.stats.stimEffect }}</div>
            <div class="stat-label">자극 효과</div>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <!-- Chart -->
        <v-col cols="6">
          <v-card style="height: 300px;">
            <div class="ws-card-header">혈압 추이</div>
            <div class="chart-container">
              <canvas ref="chartCanvas"></canvas>
            </div>
          </v-card>
        </v-col>

        <!-- Records Table -->
        <v-col cols="6">
          <v-card>
            <div class="ws-card-header">최근 측정 기록</div>
            <div style="max-height: 255px; overflow-y: auto;">
              <table class="ws-table" v-if="bpStore.records.length > 0">
                <thead>
                  <tr><th>일시</th><th>사용자</th><th>수축기</th><th>이완기</th><th>맥박</th></tr>
                </thead>
                <tbody>
                  <tr v-for="record in bpStore.records" :key="record.id">
                    <td>{{ formatDateTime(record.measured_at) }}</td>
                    <td>{{ record.user_name }}</td>
                    <td :style="{ color: getSystolicColor(record.systolic), fontWeight: 600 }">{{ record.systolic }}</td>
                    <td>{{ record.diastolic }}</td>
                    <td>{{ record.pulse }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="no-data">측정 기록이 없습니다</div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useBloodPressureStore } from '@/store'
import Chart from 'chart.js/auto'

export default {
  name: 'BloodPressureView',
  setup() {
    const bpStore = useBloodPressureStore()
    const chartCanvas = ref(null)
    let chartInstance = null

    const formatDateTime = (dateTime) => {
      if (!dateTime) return '-'
      const date = new Date(dateTime)
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    const getSystolicColor = (systolic) => {
      if (systolic >= 160) return '#ef4444'
      if (systolic >= 140) return '#f59e0b'
      return 'inherit'
    }

    const initChart = () => {
      if (!chartCanvas.value) return

      const chartData = bpStore.chartData
      const labels = chartData.length > 0 ? chartData.map(d => d.date) : []
      const systolicData = chartData.length > 0 ? chartData.map(d => d.systolic) : []
      const diastolicData = chartData.length > 0 ? chartData.map(d => d.diastolic) : []

      if (chartInstance) {
        chartInstance.destroy()
      }

      chartInstance = new Chart(chartCanvas.value, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: '수축기',
            data: systolicData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4
          }, {
            label: '이완기',
            data: diastolicData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            y: { min: 60, max: 180, grid: { color: '#f3f4f6' } },
            x: { grid: { display: false } }
          }
        }
      })
    }

    watch(() => bpStore.chartData, () => {
      initChart()
    }, { deep: true })

    onMounted(async () => {
      await bpStore.fetchRecords()
      initChart()
    })

    onUnmounted(() => {
      if (chartInstance) chartInstance.destroy()
    })

    return {
      bpStore,
      chartCanvas,
      formatDateTime,
      getSystolicColor
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
  font-size: 28px;
  font-weight: 700;
  color: #257E53;
}

.stat-label {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
}

.chart-container {
  height: calc(100% - 45px);
  padding: 8px;
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
