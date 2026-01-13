import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
  }

  /**
   * Socket 서버에 연결
   * @param {string} serverUrl - Socket.IO 서버 URL
   * @param {string} token - 인증 토큰
   */
  connect(serverUrl, token) {
    if (this.socket && this.isConnected) {
      console.log('Socket already connected');
      return;
    }

    const url = serverUrl || 'http://localhost:5000';

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      auth: {
        token: token || '',
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // 연결 이벤트
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.isConnected = true;
      this.emit('connection_status', { connected: true });
    });

    // 연결 해제 이벤트
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection_status', { connected: false, reason });
    });

    // 연결 에러 이벤트
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.emit('connection_error', { error: error.message });
    });

    // 재연결 시도 이벤트
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Reconnecting... Attempt ${attemptNumber}`);
    });

    // 재연결 성공 이벤트
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
    });

    // 비즈니스 로직 이벤트 리스너 등록
    this.setupEventListeners();
  }

  /**
   * 비즈니스 로직 이벤트 리스너 설정
   */
  setupEventListeners() {
    if (!this.socket) return;

    // 센서 데이터 업데이트
    this.socket.on('sensor_update', (data) => {
      console.log('📊 Sensor update:', data);
      this.emit('sensor_update', data);
    });

    // 새 알림
    this.socket.on('alert_new', (data) => {
      console.log('🚨 New alert:', data);
      this.emit('alert_new', data);
    });

    // 밴드 상태 변경
    this.socket.on('band_status', (data) => {
      console.log('📱 Band status changed:', data);
      this.emit('band_status', data);
    });

    // 신경자극 세션 업데이트
    this.socket.on('stim_session_update', (data) => {
      console.log('⚡ Stim session update:', data);
      this.emit('stim_session_update', data);
    });

    // 혈압 측정 완료
    this.socket.on('bp_measurement', (data) => {
      console.log('🩺 BP measurement:', data);
      this.emit('bp_measurement', data);
    });
  }

  /**
   * Socket 연결 해제
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
      console.log('Socket disconnected manually');
    }
  }

  /**
   * 이벤트 리스너 등록
   * @param {string} event - 이벤트 이름
   * @param {function} callback - 콜백 함수
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 이벤트 리스너 제거
   * @param {string} event - 이벤트 이름
   * @param {function} callback - 콜백 함수
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }

    if (callbacks.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * 이벤트 발생 (내부용)
   * @param {string} event - 이벤트 이름
   * @param {any} data - 데이터
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 서버로 이벤트 전송
   * @param {string} event - 이벤트 이름
   * @param {any} data - 데이터
   */
  send(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot send event:', event);
    }
  }

  /**
   * 연결 상태 확인
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}

// 싱글톤 인스턴스 생성
const socketService = new SocketService();

export default socketService;
