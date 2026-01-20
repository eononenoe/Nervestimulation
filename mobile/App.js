import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { DashboardProvider } from './src/contexts/DashboardContext';
import { BandProvider } from './src/contexts/BandContext';
import { NotificationProvider, useNotification } from './src/contexts/NotificationContext';
import MainNavigator from './src/navigation/MainNavigator';
import LoginScreen from './src/screens/LoginScreen';
import RealtimeNotification from './src/components/RealtimeNotification';
import { theme } from './src/utils/theme';

// Navigation Content - 인증 상태에 따라 화면 전환
const NavigationContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const { notification, closeNotification } = useNotification();

  if (loading) {
    // 로딩 화면 (선택사항)
    return null;
  }

  return (
    <>
      {isAuthenticated ? <MainNavigator /> : <LoginScreen />}

      {/* Global Notification - 모든 페이지에서 표시 */}
      {isAuthenticated && (
        <RealtimeNotification
          visible={notification.visible}
          type={notification.type}
          message={notification.message}
          userName={notification.userName}
          onPress={() => {
            closeNotification();
            // TODO: 알림 클릭 시 상세 페이지로 이동
          }}
          onClose={closeNotification}
        />
      )}
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <DashboardProvider>
            <NotificationProvider>
              <BandProvider>
                <SocketProvider>
                  <NavigationContainer>
                    <StatusBar style="light" />
                    <NavigationContent />
                  </NavigationContainer>
                </SocketProvider>
              </BandProvider>
            </NotificationProvider>
          </DashboardProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
