import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import socketService from '../services/socket';
import { useAuth } from './AuthContext';
import { useDashboard } from './DashboardContext';
import { useBand } from './BandContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

// Expo에서 자동으로 PC IP 감지
const getLocalIP = () => {
  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
    const debuggerHost = Constants.manifest?.debuggerHost;

    const host = hostUri || debuggerHost;
    if (host) {
      const ip = host.split(':')[0];
      console.log('🔍 Auto-detected PC IP for Socket:', ip);
      return ip;
    }
  } catch (error) {
    console.warn('⚠️ Failed to auto-detect IP for Socket:', error);
  }

  console.log('⚠️ Using fallback IP for Socket: 192.168.0.100');
  return '192.168.0.100';
};

// Socket URL 자동 감지
// - Android 에뮬레이터: 10.0.2.2
// - iOS 시뮬레이터: localhost
// - 실제 기기 (아이폰 등): 자동 감지된 PC IP 주소
const getSocketUrl = () => {
  if (process.env.SOCKET_URL) {
    console.log('✅ Using SOCKET_URL from env:', process.env.SOCKET_URL);
    return process.env.SOCKET_URL;
  }

  const LOCAL_IP = getLocalIP();
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  const isExpoGo = Constants.appOwnership === 'expo';

  let socketUrl;

  if (isAndroid) {
    socketUrl = 'http://10.0.2.2:5000';
  } else if (isIOS) {
    if (isExpoGo || __DEV__) {
      socketUrl = `http://${LOCAL_IP}:5000`;
    } else {
      socketUrl = 'http://localhost:5000';
    }
  } else {
    socketUrl = `http://${LOCAL_IP}:5000`;
  }

  console.log('🔌 Socket URL:', socketUrl);
  return socketUrl;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState(getSocketUrl());

  const { token, isAuthenticated } = useAuth();
  const dashboard = useDashboard();
  const band = useBand();

  // Socket 연결
  useEffect(() => {
    if (isAuthenticated && token) {
      socketService.connect(serverUrl, token);

      // 연결 상태 리스너
      const handleConnectionStatus = (data) => {
        setIsConnected(data.connected);
      };

      socketService.on('connection_status', handleConnectionStatus);

      return () => {
        socketService.off('connection_status', handleConnectionStatus);
      };
    } else {
      // 로그아웃시 연결 해제
      socketService.disconnect();
      setIsConnected(false);
    }
  }, [isAuthenticated, token, serverUrl]);

  // sensor_update - 센서 데이터 업데이트
  useEffect(() => {
    const handleSensorUpdate = (data) => {
      console.log('sensor_update received:', data);

      const sensorData = {
        band_id: data.bid,
        hr: data.hr,
        spo2: data.spo2,
        hrv_sdnn: data.hrv_sdnn,
        hrv_rmssd: data.hrv_rmssd,
        skin_temp: data.skin_temp,
        steps: data.steps,
        activity_type: data.activity_type,
        calories: data.calories,
        datetime: data.datetime,
      };

      band.updateSensorData(sensorData);
      dashboard.updateBandStatus(data.bid, sensorData);
    };

    socketService.on('sensor_update', handleSensorUpdate);

    return () => {
      socketService.off('sensor_update', handleSensorUpdate);
    };
  }, [band, dashboard]);

  // sensor_summary - 센서 요약 (대시보드용)
  useEffect(() => {
    const handleSensorSummary = (data) => {
      console.log('sensor_summary received:', data);

      dashboard.updateBandStatus(data.bid, {
        hr: data.hr,
        spo2: data.spo2,
      });
    };

    socketService.on('sensor_summary', handleSensorSummary);

    return () => {
      socketService.off('sensor_summary', handleSensorSummary);
    };
  }, [dashboard]);

  // location_update - 위치 업데이트
  useEffect(() => {
    const handleLocationUpdate = (data) => {
      console.log('location_update received:', data);

      dashboard.updateBandStatus(data.bid, {
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        location_type: data.location_type,
      });
    };

    socketService.on('location_update', handleLocationUpdate);

    return () => {
      socketService.off('location_update', handleLocationUpdate);
    };
  }, [dashboard]);

  // band_status - 밴드 상태 변경
  useEffect(() => {
    const handleBandStatus = (data) => {
      console.log('band_status received:', data);

      dashboard.updateBandStatus(data.bid, {
        status: data.status,
        battery: data.battery,
      });
    };

    socketService.on('band_status', handleBandStatus);

    return () => {
      socketService.off('band_status', handleBandStatus);
    };
  }, [dashboard]);

  // alert_new - 새 알림
  useEffect(() => {
    const handleAlertNew = (data) => {
      console.log('!!! SOCKET.IO alert_new received:', data);
      console.log('=== ALERT_NEW RECEIVED ===');
      console.log('Raw data:', JSON.stringify(data));

      // 이벤트 타입에 따른 메시지 및 레벨 설정
      let alertLevel = 'warning';
      switch (data.event_type) {
        case 'hr_high':
        case 'hr_low':
          alertLevel = data.event_level >= 3 ? 'danger' : 'warning';
          break;
        case 'spo2_low':
          alertLevel = 'danger';
          break;
        case 'fall':
          alertLevel = 'danger';
          break;
        case 'sos':
          alertLevel = 'danger';
          break;
        default:
          alertLevel = data.event_level >= 3 ? 'danger' : 'warning';
      }

      const alert = {
        id: Date.now(), // 항상 현재 시간을 사용하여 실시간 알림 표시
        dbId: data.id, // DB ID는 별도 필드에 저장
        userName: data.wearer_name || data.bid,
        message: data.message,
        level: alertLevel,
        bid: data.bid,
        type: data.event_type,
        datetime: data.datetime,
      };

      console.log('Processed alert:', JSON.stringify(alert));
      console.log('Calling dashboard.addAlert...');

      dashboard.addAlert(alert);
      dashboard.addEvent(alert);

      console.log('=== ALERT_NEW PROCESSED ===');
    };

    console.log('Registering alert_new handler');
    socketService.on('alert_new', handleAlertNew);

    return () => {
      console.log('Unregistering alert_new handler');
      socketService.off('alert_new', handleAlertNew);
    };
  }, []); // dashboard 의존성 제거 - 한 번만 등록

  // dashboard_data - 대시보드 전체 데이터
  useEffect(() => {
    const handleDashboardData = (data) => {
      console.log('dashboard_data received:', data);
      // 필요시 대시보드 전체 데이터 업데이트
    };

    socketService.on('dashboard_data', handleDashboardData);

    return () => {
      socketService.off('dashboard_data', handleDashboardData);
    };
  }, [dashboard]);

  // band_list - 밴드 목록
  useEffect(() => {
    const handleBandList = (data) => {
      console.log('band_list received:', data);
      // 필요시 밴드 목록 업데이트
    };

    socketService.on('band_list', handleBandList);

    return () => {
      socketService.off('band_list', handleBandList);
    };
  }, []);

  // stimulator_connected - 신경자극기 연결
  useEffect(() => {
    const handleStimulatorConnected = (data) => {
      console.log('stimulator_connected received:', data);

      const alert = {
        id: Date.now(),
        userName: data.bid,
        message: '신경자극기 연결됨',
        level: 'info',
        bid: data.bid,
      };

      dashboard.addAlert(alert);
    };

    socketService.on('stimulator_connected', handleStimulatorConnected);

    return () => {
      socketService.off('stimulator_connected', handleStimulatorConnected);
    };
  }, [dashboard]);

  // stimulator_disconnected - 신경자극기 연결 해제
  useEffect(() => {
    const handleStimulatorDisconnected = (data) => {
      console.log('stimulator_disconnected received:', data);

      const alert = {
        id: Date.now(),
        userName: data.bid,
        message: '신경자극기 연결 해제됨',
        level: 'info',
        bid: data.bid,
      };

      dashboard.addAlert(alert);
    };

    socketService.on('stimulator_disconnected', handleStimulatorDisconnected);

    return () => {
      socketService.off('stimulator_disconnected', handleStimulatorDisconnected);
    };
  }, [dashboard]);

  // 서버 URL 변경 (설정에서 사용)
  const updateServerUrl = useCallback((newUrl) => {
    setServerUrl(newUrl);
    if (isConnected) {
      socketService.disconnect();
      socketService.connect(newUrl, token);
    }
  }, [isConnected, token]);

  // 수동 재연결
  const reconnect = useCallback(() => {
    if (isAuthenticated && token) {
      socketService.disconnect();
      socketService.connect(serverUrl, token);
    }
  }, [isAuthenticated, token, serverUrl]);

  const value = {
    isConnected,
    serverUrl,
    updateServerUrl,
    reconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
