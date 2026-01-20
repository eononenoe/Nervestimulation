import React, { createContext, useState, useContext, useEffect } from 'react';
import { useDashboard } from './DashboardContext';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    visible: false,
    type: 'info',
    message: '',
    userName: '',
  });

  const dashboard = useDashboard();

  // 새 알림이 추가될 때 실시간 알림 표시
  useEffect(() => {
    console.log('=== NOTIFICATION CONTEXT: ALERTS CHANGED ===');
    console.log('Alerts:', JSON.stringify(dashboard.alerts));

    if (dashboard.alerts && dashboard.alerts.length > 0) {
      const latestAlert = dashboard.alerts[0];
      console.log('Latest alert:', JSON.stringify(latestAlert));

      // 마지막 알림이 최근 것인지 확인 (5초 이내)
      const now = Date.now();
      const timeDiff = now - latestAlert.id;
      console.log(`Time check: now=${now}, alert.id=${latestAlert.id}, diff=${timeDiff}`);

      if (latestAlert.id && timeDiff < 5000) {
        console.log('SHOWING GLOBAL NOTIFICATION!');
        setNotification({
          visible: true,
          type: latestAlert.level === 'danger' ? 'alert' : latestAlert.level === 'warning' ? 'warning' : 'event',
          message: latestAlert.message,
          userName: latestAlert.userName,
          alertData: latestAlert, // 상세 정보를 위한 데이터 저장
        });
      } else {
        console.log('Alert too old or no ID, not showing notification');
      }
    } else {
      console.log('No alerts to display');
    }
  }, [dashboard.alerts]);

  // 알림 닫기
  const closeNotification = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  // 알림 표시 (수동)
  const showNotification = ({ type, message, userName, alertData }) => {
    setNotification({
      visible: true,
      type,
      message,
      userName,
      alertData,
    });
  };

  const value = {
    notification,
    closeNotification,
    showNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
