/**
 * Auth Store
 * 인증 및 사용자 관리
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI, usersAPI } from '@/services/api'
import socketService from '@/services/socket'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const token = ref(localStorage.getItem('wellsafer_token') || null)
  const loading = ref(false)
  const error = ref(null)

  // Computed
  const isAuthenticated = computed(() => !!token.value)
  
  const isAdmin = computed(() => 
    user.value?.permission >= 2
  )

  const isOperator = computed(() => 
    user.value?.permission >= 1
  )

  const userName = computed(() => 
    user.value?.name || user.value?.username || '사용자'
  )

  const userRole = computed(() => {
    if (!user.value) return '게스트'
    const roles = { 0: '사용자', 1: '운영자', 2: '관리자' }
    return roles[user.value.permission] || '사용자'
  })

  // Actions
  async function login(username, password) {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.login(username, password)
      const data = response.data
      
      token.value = data.token
      user.value = data.user
      
      localStorage.setItem('wellsafer_token', data.token)
      
      // Socket 연결
      await socketService.connect()
      
      return data
    } catch (err) {
      error.value = err.response?.data?.error || err.message || '로그인 실패'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    
    try {
      await authAPI.logout()
    } catch (err) {
      console.error('[Auth] Logout error:', err)
    } finally {
      token.value = null
      user.value = null
      localStorage.removeItem('wellsafer_token')
      
      // Socket 연결 해제
      socketService.disconnect()
      
      loading.value = false
    }
  }

  async function checkAuth() {
    if (!token.value) {
      return false
    }
    
    try {
      const response = await authAPI.checkAuth()
      user.value = response.data.user
      return true
    } catch (err) {
      // 토큰 만료 등
      token.value = null
      user.value = null
      localStorage.removeItem('wellsafer_token')
      return false
    }
  }

  async function updateProfile(data) {
    if (!user.value) return
    
    try {
      const response = await usersAPI.update(user.value.id, data)
      user.value = { ...user.value, ...response.data }
      return user.value
    } catch (err) {
      console.error('[Auth] Update profile error:', err)
      throw err
    }
  }

  function setUser(userData) {
    user.value = userData
  }

  function clearError() {
    error.value = null
  }

  // 자동 로그인 시도
  async function tryAutoLogin() {
    if (token.value) {
      try {
        await socketService.connect()
        return await checkAuth()
      } catch (err) {
        console.error('[Auth] Auto login failed:', err)
        return false
      }
    }
    return false
  }

  return {
    // State
    user,
    token,
    loading,
    error,
    // Computed
    isAuthenticated,
    isAdmin,
    isOperator,
    userName,
    userRole,
    // Actions
    login,
    logout,
    checkAuth,
    updateProfile,
    setUser,
    clearError,
    tryAutoLogin
  }
})
