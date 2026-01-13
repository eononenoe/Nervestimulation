import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/nervestim',
    name: 'NerveStim',
    component: () => import('@/views/NerveStim.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/bloodpressure',
    name: 'BloodPressure',
    component: () => import('@/views/BloodPressure.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/report',
    name: 'Report',
    component: () => import('@/views/Report.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/device',
    name: 'Device',
    component: () => import('@/views/Device.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/band',
    name: 'Band',
    component: () => import('@/views/Band.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user',
    name: 'User',
    component: () => import('@/views/User.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
