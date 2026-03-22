import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import FeedScreen from './src/screens/FeedScreen';
import MapScreen from './src/screens/MapScreen';
import ReportScreen from './src/screens/ReportScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import IncidentDetailsScreen from './src/screens/IncidentDetailsScreen';
import SubscribeScreen from './src/screens/SubscribeScreen';
import GroupChatScreen from './src/screens/GroupChatScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import CaseDeckScreen from './src/screens/CaseDeckScreen';
import OpenNewCaseScreen from './src/screens/OpenNewCaseScreen';
import CaseDetailScreen from './src/screens/CaseDetailScreen';
import DeviceTrackingScreen from './src/screens/DeviceTrackingScreen';
import CounselingScreen from './src/screens/CounselingScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SearchScreen from './src/screens/SearchScreen';
import PublicProfileScreen from './src/screens/PublicProfileScreen';
import { colors } from './src/lib/theme';
import { RootStackParamList, MainTabParamList } from './src/lib/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const renderHomeIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <Ionicons name="home-outline" size={size} color={color} />
  ), []);

  const renderReportIcon = useCallback(({ focused }: { focused: boolean }) => (
    <Ionicons name="add" size={24} color={focused ? colors.primary : colors.primary} />
  ), []);

  const renderCaseDeckIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <Ionicons name="briefcase-outline" size={size} color={color} />
  ), []);

  const renderGroupsIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <Ionicons name="people-outline" size={size} color={color} />
  ), []);

  const renderProfileIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <Ionicons name="person-outline" size={size} color={color} />
  ), []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: styles.tabBarItem,
        tabBarShowLabel: true,
      }}
    >
      <Tab.Screen 
        name="Feed" 
        component={FeedScreen}
        options={{
          tabBarIcon: renderHomeIcon,
          tabBarAccessibilityLabel: 'Feed tab',
        }}
      />
      <Tab.Screen
        name="Report" 
        component={ReportScreen}
        options={{
          tabBarIcon: renderReportIcon,
          tabBarLabel: 'Report',
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.primary,
          tabBarAccessibilityLabel: 'Report incident tab',
        }}
      />
      <Tab.Screen 
        name="CaseDeck" 
        component={CaseDeckScreen}
        options={{
          tabBarIcon: renderCaseDeckIcon,
          tabBarLabel: 'Files',
          tabBarAccessibilityLabel: 'My File Deck tab',
        }}
      />
      <Tab.Screen 
        name="Groups" 
        component={GroupsScreen}
        options={{
          tabBarIcon: renderGroupsIcon,
          tabBarAccessibilityLabel: 'Groups tab',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: renderProfileIcon,
          tabBarAccessibilityLabel: 'Profile tab',
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen 
            name="Main" 
            component={MainTabs}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen 
            name="IncidentDetails" 
            component={IncidentDetailsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen 
            name="Subscribe" 
            component={SubscribeScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen 
            name="GroupChat" 
            component={GroupChatScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen 
            name="CreateGroup" 
            component={CreateGroupScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen 
            name="CaseDetail" 
            component={CaseDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen 
            name="OpenNewCase" 
            component={OpenNewCaseScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen 
            name="DeviceTracking" 
            component={DeviceTrackingScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen 
            name="Counseling" 
            component={CounselingScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen 
            name="Search" 
            component={SearchScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen 
            name="PublicProfile" 
            component={PublicProfileScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 60,
    paddingBottom: Platform.OS === 'ios' ? 24 : 4,
    paddingTop: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarItem: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
