/**
 * Wellsafer Socket Service
 * 실시간 데이터 통신 모듈
 */
import { io } from 'socket.io-client'
import { ref, reactive } from 'vue'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:18080'

class SocketService {
  constructor() {
    this.socket = null
    this.adminSocket = null
    this.connected = ref(false)
    this.listeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
  }

  /**
   * 소켓 연결
   */
  connect() {
    if (this.socket?.connected) {
      return Promise.resolve(this.socket)
    }

    return new Promise((resolve, reject) => {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      })

      this.socket.on('connect', () => {
        console.log('[Socket] Connected:', this.socket.id)
        this.connected.value = true
        this.reconnectAttempts = 0
        resolve(this.socket)
      })

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason)
        this.connected.value = false
      })

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error)
        this.reconnectAttempts++
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(error)
        }
      })

      this.socket.on('error', (error) => {
        console.error('[Socket] Error:', error)
      })

      // 기본 이벤트 리스너
      this._setupDefaultListeners()
    })
  }

  /**
   * Admin 네임스페이스 연결
   */
  connectAdmin() {
    if (this.adminSocket?.connected) {
      return Promise.resolve(this.adminSocket)
    }

    return new Promise((resolve, reject) => {
      this.adminSocket = io(`${SOCKET_URL}/admin`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts
      })

      this.adminSocket.on('connect', () => {
        console.log('[Socket Admin] Connected')
        resolve(this.adminSocket)
      })

      this.adminSocket.on('connect_error', (error) => {
        console.error('[Socket Admin] Error:', error)
        reject(error)
      })
    })
  }

  /**
   * 기본 이벤트 리스너 설정
   */
  _setupDefaultListeners() {
    // 연결 확인
    this.socket.on('connected', (data) => {
      console.log('[Socket] Server confirmed connection:', data)
    })

    // 밴드 데이터
    this.socket.on('band_data', (data) => {
      this._emit('band_data', data)
    })

    // GPS 데이터
    this.socket.on('gps_data', (data) => {
      this._emit('gps_data', data)
    })

    // 이벤트/알림
    this.socket.on('event', (data) => {
      this._emit('event', data)
    })

    this.socket.on('alert', (data) => {
      this._emit('alert', data)
    })

    // 신경자극 상태
    this.socket.on('stim_update', (data) => {
      this._emit('stim_update', data)
    })

    this.socket.on('stim_command_ack', (data) => {
      this._emit('stim_command_ack', data)
    })
  }

  /**
   * 밴드 실시간 데이터 구독
   */
  subscribeBand(bandId) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Not connected, cannot subscribe')
      return
    }
    this.socket.emit('subscribe_band', { band_id: bandId })
  }

  /**
   * 밴드 구독 해제
   */
  unsubscribeBand(bandId) {
    if (!this.socket?.connected) return
    this.socket.emit('unsubscribe_band', { band_id: bandId })
  }

  /**
   * 알림 구독
   */
  subscribeAlerts() {
    if (!this.socket?.connected) return
    this.socket.emit('subscribe_alerts')
  }

  /**
   * 밴드 데이터 요청
   */
  requestBandData(bandId) {
    if (!this.socket?.connected) return
    this.socket.emit('request_band_data', { band_id: bandId })
  }

  /**
   * 신경자극 명령 전송
   */
  sendStimCommand(bandId, command, params = {}) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Not connected, cannot send command')
      return Promise.reject(new Error('Socket not connected'))
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('stim_command', {
        band_id: bandId,
        command: command,
        params: params
      })

      // ACK 대기
      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'))
      }, 10000)

      this.once('stim_command_ack', (data) => {
        clearTimeout(timeout)
        if (data.band_id === bandId) {
          resolve(data)
        }
      })
    })
  }

  /**
   * 이벤트 리스너 등록
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)

    // 반환값으로 unsubscribe 함수 제공
    return () => {
      this.off(event, callback)
    }
  }

  /**
   * 일회성 이벤트 리스너
   */
  once(event, callback) {
    const wrapper = (data) => {
      callback(data)
      this.off(event, wrapper)
    }
    this.on(event, wrapper)
  }

  /**
   * 이벤트 리스너 해제
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      if (callback) {
        this.listeners.get(event).delete(callback)
      } else {
        this.listeners.delete(event)
      }
    }
  }

  /**
   * 내부 이벤트 발생
   */
  _emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[Socket] Listener error for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 소켓 연결 해제
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    if (this.adminSocket) {
      this.adminSocket.disconnect()
      this.adminSocket = null
    }
    this.connected.value = false
    this.listeners.clear()
  }

  /**
   * 연결 상태 확인
   */
  isConnected() {
    return this.socket?.connected || false
  }
}

// 싱글톤 인스턴스
const socketService = new SocketService()

// Vue 컴포지션 API용 훅
export function useSocket() {
  return {
    socket: socketService,
    connected: socketService.connected,
    connect: () => socketService.connect(),
    disconnect: () => socketService.disconnect(),
    subscribeBand: (bandId) => socketService.subscribeBand(bandId),
    unsubscribeBand: (bandId) => socketService.unsubscribeBand(bandId),
    subscribeAlerts: () => socketService.subscribeAlerts(),
    requestBandData: (bandId) => socketService.requestBandData(bandId),
    sendStimCommand: (bandId, cmd, params) => socketService.sendStimCommand(bandId, cmd, params),
    on: (event, cb) => socketService.on(event, cb),
    off: (event, cb) => socketService.off(event, cb)
  }
}

export default socketService
