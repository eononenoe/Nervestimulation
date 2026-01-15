import React, { createContext, useState, useContext, useCallback } from 'react';
import { dashboardAPI } from '../services/api';

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  // Mock 데이터
  const getMockData = () => ({
    alerts: [
      { id: 1, userName: '김영희', message: '혈압 상승 - 152/98 mmHg', level: 'danger' },
      { id: 2, userName: '박철수', message: '심박수 이상 - 108 BPM', level: 'warning' },
      { id: 3, userName: '이민수', message: 'SpO2 저하 - 94%', level: 'warning' },
    ],
    bands: [
      { id: 1, name: '김영희', band_id: 'WS-2024-0001', status: 'online', hr: 72, spo2: '98%', bp: '152/98', bpClass: 'danger' },
      { id: 2, name: '박철수', band_id: 'WS-2024-0002', status: 'online', hr: 108, spo2: '97%', bp: '128/82', hrClass: 'warning' },
      { id: 3, name: '이민수', band_id: 'WS-2024-0003', status: 'online', hr: 85, spo2: '94%', bp: '118/76', spo2Class: 'warning' },
      { id: 4, name: '최지원', band_id: 'WS-2024-0004', status: 'offline', hr: '-', spo2: '-', bp: '-' },
    ]
  });

  const mockData = getMockData();

  const [alerts, setAlerts] = useState(mockData.alerts);
  const [events, setEvents] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [bandLocations, setBandLocations] = useState([]);
  const [bands, setBands] = useState(mockData.bands);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 대시보드 데이터 로드
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dashboardAPI.getDashboard();
      // 백엔드 응답: { success: true, data: {...} }
      const data = response.data.data || response.data;

      setAlerts(data.alerts || mockData.alerts);
      setEvents(data.events || []);
      setWeeklyStats(data.weeklyStats || []);
      setBandLocations(data.bandLocations || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      // API 실패 시 이미 설정된 Mock 데이터 유지
    } finally {
      setLoading(false);
    }
  }, [mockData.alerts]);

  // 밴드 목록 로드
  const loadBands = useCallback(async () => {
    try {
      const response = await dashboardAPI.getBands();
      // 백엔드 응답: { success: true, data: [...] }
      const bandsData = response.data.data || response.data;
      console.log('Loaded bands:', bandsData);
      setBands(Array.isArray(bandsData) ? bandsData : mockData.bands);
    } catch (error) {
      console.error('Failed to load bands:', error);
      // API 실패 시 이미 설정된 Mock 데이터 유지
    }
  }, [mockData.bands]);

  // 알림 추가 (Socket에서 호출)
  const addAlert = useCallback((alert) => {
    console.log('DashboardContext.addAlert called with:', JSON.stringify(alert));
    setAlerts((prev) => {
      const newAlerts = [alert, ...prev].slice(0, 10);
      console.log('New alerts array:', JSON.stringify(newAlerts));
      return newAlerts;
    });
  }, []);

  // 이벤트 추가 (Socket에서 호출)
  const addEvent = useCallback((event) => {
    setEvents((prev) => [event, ...prev].slice(0, 10)); // 최대 10개 유지
  }, []);

  // 밴드 상태 업데이트 (Socket에서 호출)
  const updateBandStatus = useCallback((bandId, status) => {
    setBands((prev) =>
      prev.map((band) =>
        band.id === bandId ? { ...band, ...status } : band
      )
    );
    setBandLocations((prev) =>
      prev.map((location) =>
        location.id === bandId ? { ...location, ...status } : location
      )
    );
  }, []);

  // 통계 초기화
  const clearData = useCallback(() => {
    setAlerts([]);
    setEvents([]);
    setWeeklyStats([]);
    setBandLocations([]);
    setBands([]);
  }, []);

  const value = {
    alerts,
    events,
    weeklyStats,
    bandLocations,
    bands,
    loading,
    error,
    loadDashboard,
    loadBands,
    addAlert,
    addEvent,
    updateBandStatus,
    clearData,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export default DashboardContext;
