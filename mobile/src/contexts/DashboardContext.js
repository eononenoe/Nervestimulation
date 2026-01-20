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
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 대시보드 데이터 로드
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 대시보드 요약 통계 로드
      const summaryResponse = await dashboardAPI.getDashboard();
      const summaryData = summaryResponse.data.data || summaryResponse.data;
      setSummary(summaryData);

      // 최근 이벤트/알림 로드
      const eventsResponse = await dashboardAPI.getEvents(20);
      const eventsData = eventsResponse.data.data || eventsResponse.data;

      // 이벤트를 alerts 형식으로 변환
      const alertsData = eventsData.map(event => ({
        id: event.id,
        dbId: event.id,
        userName: event.wearer_name || event.bid,
        message: event.message,
        level: event.event_level >= 3 ? 'danger' : 'warning',
        bid: event.bid,
        type: event.event_type,
        datetime: event.datetime,
      }));

      setAlerts(alertsData);
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 밴드 목록 로드
  const loadBands = useCallback(async () => {
    try {
      // 밴드 상태 요약 로드 (센서 데이터 포함) - 우선 시도
      let response;
      try {
        response = await dashboardAPI.getBandsStatus();
      } catch (err) {
        // 404 에러 시 폴백: 기본 밴드 목록 사용
        console.warn('bands-status endpoint not available, using bands/list fallback');
        response = await dashboardAPI.getBands();
      }

      const bandsData = response.data.data || response.data;
      console.log('Loaded bands:', bandsData);

      // 백엔드 데이터를 프론트엔드 형식으로 변환
      const formattedBands = bandsData.map(band => ({
        id: band.bid,
        name: band.wearer_name,
        band_id: band.bid,
        status: band.connect_state === 1 ? 'online' : 'offline',
        hr: band.latest_hr || '-',
        spo2: band.latest_spo2 ? `${band.latest_spo2}%` : '-',
        battery: band.battery || 0,
        stimulator_connected: band.stimulator_connected,
        last_data_at: band.last_data_at,
        event_count_24h: band.event_count_24h || 0,
      }));

      setBands(formattedBands);
    } catch (error) {
      console.error('Failed to load bands:', error);
      setError(error.message);
    }
  }, []);

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
        band.band_id === bandId ? { ...band, ...status } : band
      )
    );
  }, []);

  // 통계 초기화
  const clearData = useCallback(() => {
    setAlerts([]);
    setEvents([]);
    setSummary(null);
    setBands([]);
  }, []);

  const value = {
    alerts,
    events,
    summary,
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
