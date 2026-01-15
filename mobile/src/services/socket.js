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

    // 새로운 백엔드는 namespace 사용 안함
    this.socket = io(url, {
      transports: ['polling', 'websocket'], // polling 먼저 시도하여 안정성 확보
      auth: {
        token: token || '',
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // 무제한 재연결 시도
      timeout: 20000, // 연결 타임아웃 20초
      pingTimeout: 180000, // 서버 ping 대기 시간 3분 (서버 설정과 동일)
      pingInterval: 60000, // ping 전송 간격 1분 (서버 설정과 동일)
      upgrade: true, // polling에서 websocket으로 업그레이드 허용
      rememberUpgrade: false, // 재연결 시 항상 polling부터 시작
      forceNew: false, // 기존 연결 재사용
    });

    // 연결 이벤트
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.isConnected = true;
      this.emit('connection_status', { connected: true });

      // 대시보드 구독 (전체 알림 및 요약 정보 수신)
      this.socket.emit('subscribe_dashboard');
      console.log('Subscribed to dashboard');

      // 알림 구독
      this.socket.emit('subscribe_alerts');
      console.log('Subscribed to alerts');
    });

    // 연결 해제 이벤트
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
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
      console.log(`Reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;

      // 재연결 후 룸 재구독
      this.socket.emit('subscribe_dashboard');
      console.log('Re-subscribed to dashboard after reconnect');

      this.socket.emit('subscribe_alerts');
      console.log('Re-subscribed to alerts after reconnect');
    });

    // 비즈니스 로직 이벤트 리스너 등록
    this.setupEventListeners();
  }

  /**
   * 비즈니스 로직 이벤트 리스너 설정
   */
  setupEventListeners() {
    console.log('=== setupEventListeners called ===');
    if (!this.socket) {
      console.log('ERROR: socket is null!');
      return;
    }
    console.log('Registering socket.io event listeners...');

    // connected - 연결 확인
    this.socket.on('connected', (data) => {
      console.log('Connected with SID:', data.sid);
    });

    // sensor_update - 센서 데이터 업데이트
    this.socket.on('sensor_update', (data) => {
      console.log('sensor_update:', data);
      this.emit('sensor_update', data);
    });

    // location_update - 위치 업데이트
    this.socket.on('location_update', (data) => {
      console.log('location_update:', data);
      this.emit('location_update', data);
    });

    // band_status - 밴드 상태 변경
    this.socket.on('band_status', (data) => {
      console.log('band_status:', data);
      this.emit('band_status', data);
    });

    // alert_new - 새 알림
    console.log('>>> Registering alert_new socket.io listener');
    this.socket.on('alert_new', (data) => {
      console.log('!!! SOCKET.IO alert_new received:', data);
      this.emit('alert_new', data);
    });

    // sensor_summary - 센서 요약 (대시보드용)
    this.socket.on('sensor_summary', (data) => {
      console.log('sensor_summary:', data);
      this.emit('sensor_summary', data);
    });

    // dashboard_data - 대시보드 전체 데이터
    this.socket.on('dashboard_data', (data) => {
      console.log('dashboard_data:', data);
      this.emit('dashboard_data', data);
    });

    // band_list - 밴드 목록
    this.socket.on('band_list', (data) => {
      console.log('band_list:', data);
      this.emit('band_list', data);
    });

    // band_current_state - 밴드 현재 상태
    this.socket.on('band_current_state', (data) => {
      console.log('band_current_state:', data);
      this.emit('band_current_state', data);
    });

    // stimulator_connected - 신경자극기 연결
    this.socket.on('stimulator_connected', (data) => {
      console.log('stimulator_connected:', data);
      this.emit('stimulator_connected', data);
    });

    // stimulator_disconnected - 신경자극기 연결 해제
    this.socket.on('stimulator_disconnected', (data) => {
      console.log('stimulator_disconnected:', data);
      this.emit('stimulator_disconnected', data);
    });

    // stim_status_update - 신경자극 상태 업데이트
    this.socket.on('stim_status_update', (data) => {
      console.log('stim_status_update:', data);
      this.emit('stim_status_update', data);
    });

    // stim_level_changed - 신경자극 강도 변경
    this.socket.on('stim_level_changed', (data) => {
      console.log('stim_level_changed:', data);
      this.emit('stim_level_changed', data);
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

  /**
   * 특정 밴드 구독
   * @param {string} bid - 밴드 ID
   */
  subscribeBand(bid) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_band', { bid });
      console.log(`Subscribed to band: ${bid}`);
    }
  }

  /**
   * 밴드 구독 해제
   * @param {string} bid - 밴드 ID
   */
  unsubscribeBand(bid) {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe_band', { bid });
      console.log(`Unsubscribed from band: ${bid}`);
    }
  }

  /**
   * 신경자극 세션 구독
   * @param {string} sessionId - 세션 ID
   */
  subscribeNerveStim(sessionId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_nervestim', { session_id: sessionId });
      console.log(`Subscribed to session: ${sessionId}`);
    }
  }

  /**
   * 신경자극 세션 구독 해제
   * @param {string} sessionId - 세션 ID
   */
  unsubscribeNerveStim(sessionId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe_nervestim', { session_id: sessionId });
      console.log(`Unsubscribed from session: ${sessionId}`);
    }
  }

  /**
   * 밴드 목록 요청
   */
  requestBandList() {
    if (this.socket && this.isConnected) {
      this.socket.emit('get_band_list');
    }
  }

  /**
   * 밴드 핑 요청
   * @param {string} bid - 밴드 ID
   */
  pingBand(bid) {
    if (this.socket && this.isConnected) {
      this.socket.emit('ping_band', { bid });
    }
  }

  /**
   * 위치 정보 요청
   * @param {string} bid - 밴드 ID
   */
  requestLocation(bid) {
    if (this.socket && this.isConnected) {
      this.socket.emit('request_location', { bid });
    }
  }
}

// 싱글톤 인스턴스 생성
const socketService = new SocketService();

export default socketService;
