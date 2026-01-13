import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { DashboardProvider } from './src/contexts/DashboardContext';
import { BandProvider } from './src/contexts/BandContext';
import MainNavigator from './src/navigation/MainNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { theme } from './src/utils/theme';

// Navigation Content - 인증 상태에 따라 화면 전환
const NavigationContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // 로딩 화면 (선택사항)
    return null;
  }

  return isAuthenticated ? <MainNavigator /> : <LoginScreen />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <DashboardProvider>
            <BandProvider>
              <SocketProvider>
                <NavigationContainer>
                  <StatusBar style="light" />
                  <NavigationContent />
                </NavigationContainer>
              </SocketProvider>
            </BandProvider>
          </DashboardProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
