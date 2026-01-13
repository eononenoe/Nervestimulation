<template>
  <v-app>
    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      permanent
      color="secondary"
      width="180"
    >
      <div class="nav-logo">Wellsafer</div>
      
      <v-list density="compact" nav>
        <v-list-item
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          :active="$route.path === item.path"
          active-class="nav-active"
        >
          <v-list-item-title class="nav-item-text">{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <template v-slot:append>
        <div class="pa-3">
          <v-btn block color="primary" class="mb-2" @click="goToMyPage">My Page</v-btn>
          <v-btn block color="primary" @click="logout">Logout</v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main class="bg-background">
      <v-container fluid class="pa-6">
        <router-view />
      </v-container>
    </v-main>

    <!-- Toast Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top right"
    >
      {{ snackbar.message }}
    </v-snackbar>

    <!-- Band Detail Panel -->
    <BandDetailPanel 
      v-model="bandDetailOpen"
      :band="selectedBand"
      @close="bandDetailOpen = false"
    />

    <!-- Device Detail Panel -->
    <DeviceDetailPanel
      v-model="deviceDetailOpen"
      :device="selectedDevice"
      :device-type="selectedDeviceType"
      @close="deviceDetailOpen = false"
    />
  </v-app>
</template>

<script>
import { ref, provide } from 'vue'
import { useRouter } from 'vue-router'
import BandDetailPanel from '@/components/panels/BandDetailPanel.vue'
import DeviceDetailPanel from '@/components/panels/DeviceDetailPanel.vue'

export default {
  name: 'App',
  components: {
    BandDetailPanel,
    DeviceDetailPanel
  },
  setup() {
    const router = useRouter()
    const drawer = ref(true)
    
    const menuItems = [
      { title: '대시보드', path: '/dashboard' },
      { title: '신경자극 관리', path: '/nervestim' },
      { title: '혈압 관리', path: '/bloodpressure' },
      { title: '건강 리포트', path: '/report' },
      { title: '기기 관리', path: '/device' },
      { title: '밴드 조회', path: '/band' },
      { title: '사용자', path: '/user' }
    ]

    // Snackbar
    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const showToast = (message, type = 'success') => {
      snackbar.value = {
        show: true,
        message,
        color: type
      }
    }

    // Band Detail Panel
    const bandDetailOpen = ref(false)
    const selectedBand = ref(null)

    const openBandDetail = (band) => {
      selectedBand.value = band
      bandDetailOpen.value = true
    }

    // Device Detail Panel
    const deviceDetailOpen = ref(false)
    const selectedDevice = ref(null)
    const selectedDeviceType = ref('band')

    const openDeviceDetail = (device, type) => {
      selectedDevice.value = device
      selectedDeviceType.value = type
      deviceDetailOpen.value = true
    }

    // Provide functions to children
    provide('showToast', showToast)
    provide('openBandDetail', openBandDetail)
    provide('openDeviceDetail', openDeviceDetail)

    const goToMyPage = () => {
      showToast('마이페이지로 이동합니다', 'success')
    }

    const logout = () => {
      showToast('로그아웃 되었습니다', 'warning')
      router.push('/login')
    }

    return {
      drawer,
      menuItems,
      snackbar,
      showToast,
      bandDetailOpen,
      selectedBand,
      deviceDetailOpen,
      selectedDevice,
      selectedDeviceType,
      goToMyPage,
      logout
    }
  }
}
</script>

<style lang="scss">
.nav-logo {
  padding: 20px 16px;
  text-align: center;
  color: white;
  font-size: 22px;
  font-weight: 700;
}

.nav-item-text {
  color: white !important;
  font-size: 14px;
}

.nav-active {
  background: #257E53 !important;
}

.bg-background {
  background-color: #F2F9F5 !important;
}
</style>
