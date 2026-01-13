import React, { createContext, useState, useContext, useCallback } from 'react';
import { bandAPI } from '../services/api';

const BandContext = createContext();

export const useBand = () => {
  const context = useContext(BandContext);
  if (!context) {
    throw new Error('useBand must be used within BandProvider');
  }
  return context;
};

export const BandProvider = ({ children }) => {
  const [selectedBand, setSelectedBand] = useState(null);
  const [bandDetail, setBandDetail] = useState(null);
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 밴드 상세 정보 로드
  const loadBandDetail = useCallback(async (bandId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await bandAPI.getDetail(bandId);
      const data = response.data;

      setBandDetail(data);
      setSelectedBand(data);
    } catch (error) {
      console.error('Failed to load band detail:', error);
      setError('밴드 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 센서 데이터 로드
  const loadSensorData = useCallback(async (bandId, params = {}) => {
    try {
      const response = await bandAPI.getSensorData(bandId, params);
      setSensorData(response.data || []);
    } catch (error) {
      console.error('Failed to load sensor data:', error);
    }
  }, []);

  // 실시간 센서 데이터 업데이트 (Socket에서 호출)
  const updateSensorData = useCallback((data) => {
    if (selectedBand && data.band_id === selectedBand.id) {
      // 현재 선택된 밴드의 데이터만 업데이트
      setBandDetail((prev) => ({
        ...prev,
        ...data,
      }));

      // 센서 데이터 히스토리 업데이트
      setSensorData((prev) => [data, ...prev].slice(0, 100)); // 최대 100개 유지
    }
  }, [selectedBand]);

  // 밴드 선택
  const selectBand = useCallback((band) => {
    setSelectedBand(band);
    if (band) {
      loadBandDetail(band.id);
    }
  }, [loadBandDetail]);

  // 밴드 선택 해제
  const clearSelection = useCallback(() => {
    setSelectedBand(null);
    setBandDetail(null);
    setSensorData([]);
  }, []);

  const value = {
    selectedBand,
    bandDetail,
    sensorData,
    loading,
    error,
    loadBandDetail,
    loadSensorData,
    updateSensorData,
    selectBand,
    clearSelection,
  };

  return <BandContext.Provider value={value}>{children}</BandContext.Provider>;
};

export default BandContext;
