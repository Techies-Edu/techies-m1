/**
 * AppNavigator — Techies Application Navigator with Session Gate and Custom Neo-Brutalist Navigation.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  HomeScreen,
  ProfileScreen,
  MyProfileScreen,
  AuthScreen,
  ConnectionsScreen,
  EventsScreen,
  EventDetailScreen,
  NotificationsScreen,
  SettingsScreen,
  QRScreen,
  QRScannerScreen,
} from '../screens';
import { RootStackParamList } from './types';
import { ThemeProvider, useTheme, spacing, typography } from '../theme';
import AuthService from '../services/auth/AuthService';
import { UserSession } from '../types/AuthTypes';

import { RandomLetterSwap } from '../components/ui/RandomLetterSwap';

const Stack = createNativeStackNavigator<RootStackParamList>();

type TabName = 'Home' | 'Connections' | 'Events' | 'Notifications' | 'Settings';

const CustomTabBar: React.FC<{
  currentTab: TabName;
  onSelectTab: (tab: TabName) => void;
}> = ({ currentTab, onSelectTab }) => {
  const { colors } = useTheme();

  const tabs: { name: TabName; label: string; icon: string }[] = [
    { name: 'Home', label: 'Nearby', icon: '📡' },
    { name: 'Connections', label: 'Network', icon: '🤝' },
    { name: 'Events', label: 'Events', icon: '📅' },
    { name: 'Notifications', label: 'Alerts', icon: '🔔' },
    { name: 'Settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <View style={styles.tabBarWrapper}>
      <View
        style={[
          styles.tabBarPill,
          {
            backgroundColor: colors.surface,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.name;
          return (
            <TouchableOpacity
              key={tab.name}
              style={[
                styles.tabItem,
                isActive && [styles.activeTabItem, { backgroundColor: colors.primary }],
              ]}
              onPress={() => onSelectTab(tab.name)}
              activeOpacity={0.85}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              {isActive && (
                <RandomLetterSwap
                  label={tab.label}
                  isActive={isActive}
                  style={[styles.tabLabel, { color: colors.white }]}
                  staggerDuration={0.025}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const MainTabNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabName>('Home');

  return (
    <View style={styles.tabContainer}>
      <View style={styles.tabContent}>
        {activeTab === 'Home' && <HomeScreen />}
        {activeTab === 'Connections' && <ConnectionsScreen />}
        {activeTab === 'Events' && <EventsScreen />}
        {activeTab === 'Notifications' && <NotificationsScreen />}
        {activeTab === 'Settings' && <SettingsScreen />}
      </View>
      <CustomTabBar currentTab={activeTab} onSelectTab={setActiveTab} />
    </View>
  );
};

const NavigatorContent: React.FC = () => {
  const { colors } = useTheme();
  const [session, setSession] = useState<UserSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    AuthService.getCurrentSession().then((sess) => {
      setSession(sess);
      setLoadingSession(false);
    });
  }, []);

  if (loadingSession) {
    return <View style={[styles.loadingBox, { backgroundColor: colors.background }]} />;
  }

  return (
    <Stack.Navigator
      initialRouteName={session ? 'Home' : 'Auth'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Auth">
        {(props) => (
          <AuthScreen
            onAuthSuccess={(sess) => {
              setSession(sess);
              props.navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Home" component={MainTabNavigator} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="MyProfile" component={MyProfileScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="QRScreen" component={QRScreen} />
      <Stack.Screen name="QRScannerScreen" component={QRScannerScreen} />
    </Stack.Navigator>
  );
};

export const AppNavigator: React.FC = () => (
  <ThemeProvider>
    <NavigatorContent />
  </ThemeProvider>
);

const styles = StyleSheet.create({
  loadingBox: {
    flex: 1,
  },
  tabContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: spacing.md + 2,
    left: spacing.base,
    right: spacing.base,
    alignItems: 'center',
  },
  tabBarPill: {
    flexDirection: 'row',
    height: 60,
    borderRadius: spacing.radiusFull,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs + 3,
    elevation: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    width: '100%',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs + 6,
    paddingVertical: spacing.xs + 3,
    borderRadius: spacing.radiusFull,
    gap: 4,
  },
  activeTabItem: {},
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
  },
});
