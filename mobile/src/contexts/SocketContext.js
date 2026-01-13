import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
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

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://localhost:5000');

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

  // 센서 데이터 업데이트 이벤트
  useEffect(() => {
    const handleSensorUpdate = (data) => {
      console.log('📊 Sensor update received:', data);
      band.updateSensorData(data);
      dashboard.updateBandStatus(data.band_id, {
        hr: data.hr,
        spo2: data.spo2,
        bp: data.bp,
      });
    };

    socketService.on('sensor_update', handleSensorUpdate);

    return () => {
      socketService.off('sensor_update', handleSensorUpdate);
    };
  }, [band, dashboard]);

  // 새 알림 이벤트
  useEffect(() => {
    const handleNewAlert = (data) => {
      console.log('🚨 New alert received:', data);
      dashboard.addAlert(data);
    };

    socketService.on('alert_new', handleNewAlert);

    return () => {
      socketService.off('alert_new', handleNewAlert);
    };
  }, [dashboard]);

  // 밴드 상태 변경 이벤트
  useEffect(() => {
    const handleBandStatus = (data) => {
      console.log('📱 Band status changed:', data);
      dashboard.updateBandStatus(data.band_id, {
        status: data.status,
        connect_state: data.connect_state,
      });
    };

    socketService.on('band_status', handleBandStatus);

    return () => {
      socketService.off('band_status', handleBandStatus);
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
