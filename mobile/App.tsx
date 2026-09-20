import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, Platform, AppState, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

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
import { supabase } from './src/lib/supabase';

const authLogo = require('./assets/ngumu-eye-logo-transparent.png');

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
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setCheckingSession(false);
    }).catch(() => {
      if (mounted) setCheckingSession(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setCheckingSession(false);
    });

    const syncAutoRefresh = (state: string) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };

    syncAutoRefresh(AppState.currentState);
    const appStateListener = AppState.addEventListener('change', syncAutoRefresh);

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      appStateListener.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  if (checkingSession) {
    return (
      <SafeAreaProvider>
        <View style={styles.authLoadingContainer}>
          <StatusBar style="dark" />
          <Image source={authLogo} style={styles.authLoadingLogo} resizeMode="contain" />
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          key={session ? 'authenticated' : 'guest'}
          screenOptions={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {session ? (
            <>
              <Stack.Screen name="Main" component={MainTabs} options={{ animation: 'fade' }} />
              <Stack.Screen name="IncidentDetails" component={IncidentDetailsScreen} />
              <Stack.Screen name="Subscribe" component={SubscribeScreen} />
              <Stack.Screen name="GroupChat" component={GroupChatScreen} />
              <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
              <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
              <Stack.Screen name="OpenNewCase" component={OpenNewCaseScreen} />
              <Stack.Screen name="DeviceTracking" component={DeviceTrackingScreen} />
              <Stack.Screen name="Counseling" component={CounselingScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  authLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: colors.background,
  },
  authLoadingLogo: {
    width: 120,
    height: 120,
    backgroundColor: 'transparent',
  },
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
