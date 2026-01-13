import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import NerveStimScreen from '../screens/NerveStimScreen';
import BloodPressureScreen from '../screens/BloodPressureScreen';
import DeviceScreen from '../screens/DeviceScreen';
import ReportScreen from '../screens/ReportScreen';
import BandSearchScreen from '../screens/BandSearchScreen';
import UserManageScreen from '../screens/UserManageScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../utils/theme';
import { scaleSize, scaleFontSize } from '../utils/responsive';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// 대시보드 탭의 Stack Navigator
const DashboardStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={DashboardScreen} />
      <Stack.Screen name="NerveStim" component={NerveStimScreen} />
      <Stack.Screen name="BloodPressure" component={BloodPressureScreen} />
      <Stack.Screen name="Device" component={DeviceScreen} />
      <Stack.Screen name="Report" component={ReportScreen} />
    </Stack.Navigator>
  );
};

// 메인 탭 네비게이터
const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'view-dashboard';
              break;
            case 'BandSearch':
              iconName = 'magnify';
              break;
            case 'UserManage':
              iconName = 'account-group';
              break;
            case 'Settings':
              iconName = 'cog';
              break;
            default:
              iconName = 'circle';
          }

          return (
            <MaterialCommunityIcons
              name={iconName}
              size={scaleSize(22)}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.grey,
        tabBarStyle: {
          height: scaleSize(60),
          paddingBottom: scaleSize(5),
          paddingTop: scaleSize(5),
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: scaleFontSize(10),
          fontWeight: '500',
          marginTop: scaleSize(2),
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{ tabBarLabel: '대시보드' }}
      />
      <Tab.Screen
        name="BandSearch"
        component={BandSearchScreen}
        options={{ tabBarLabel: '밴드조회' }}
      />
      <Tab.Screen
        name="UserManage"
        component={UserManageScreen}
        options={{ tabBarLabel: '사용자' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: '설정' }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
