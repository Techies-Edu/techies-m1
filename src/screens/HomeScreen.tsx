/**
 * HomeScreen — Techies Bluetooth Nearby Discovery & Quick QR Networking.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { PermissionGate } from '../components/PermissionGate';
import { ErrorBanner } from '../components/ErrorBanner';
import { UserList } from '../components/UserList';
import { ProximityModal } from '../components/ProximityModal';
import { ConsentModal } from '../components/ConsentModal';
import { useBleSetup } from '../hooks/useBleSetup';
import { useNearbyUsers } from '../hooks/useNearbyUsers';
import ProfileSyncService from '../services/profile/ProfileSyncService';
import ConnectionService from '../services/connection/ConnectionService';
import { isCloseProximity } from '../utils/distance';
import { UserProfile, NearbyUser } from '../types/ProfileTypes';
import { useTheme } from '../theme';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();

  const { scanningStatus, permissions, requestPermissionsAndStart, errorMessage, clearError } =
    useBleSetup();

  const nearbyUsers = useNearbyUsers();

  const [consentPeer, setConsentPeer] = useState<UserProfile | null>(null);

  // Proximity modal state (< 12 cm)
  const [proximityUser, setProximityUser] = useState<NearbyUser | null>(null);
  const dismissedDevicesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    ProfileSyncService.start();
    return () => {
      ProfileSyncService.stop();
    };
  }, []);

  useEffect(() => {
    const closeUser = nearbyUsers.find(
      (u) => isCloseProximity(u.rssi) && !dismissedDevicesRef.current.has(u.deviceId),
    );

    if (closeUser && !proximityUser) {
      setProximityUser(closeUser);
    }
  }, [nearbyUsers, proximityUser]);

  const handleUserPress = (deviceId: string) => {
    const user = nearbyUsers.find((u) => u.deviceId === deviceId);
    if (user && user.profile) {
      setConsentPeer(user.profile);
    } else {
      navigation.navigate('Profile', { deviceId });
    }
  };

  const handleAcceptConsent = async () => {
    if (consentPeer) {
      await ConnectionService.addConnection(consentPeer, 'Bluetooth');
      const peerId = consentPeer.deviceId;
      setConsentPeer(null);
      navigation.navigate('Profile', { deviceId: peerId });
    }
  };

  const handleDeclineConsent = () => {
    setConsentPeer(null);
  };

  const handleMyProfilePress = () => {
    navigation.navigate('MyProfile');
  };

  const handleQRPress = useCallback(() => {
    navigation.navigate('QRScreen');
  }, [navigation]);

  const handleScanQRPress = useCallback(() => {
    navigation.navigate('QRScannerScreen');
  }, [navigation]);

  const handleDismissProximity = () => {
    if (proximityUser) {
      dismissedDevicesRef.current.add(proximityUser.deviceId);
      setProximityUser(null);
    }
  };

  const handleViewProximityProfile = (deviceId: string) => {
    handleDismissProximity();
    navigation.navigate('Profile', { deviceId });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.isDark ? 'light-content' : 'dark-content'}
        backgroundColor="#4F46E5"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Large Purple Header Section */}
        <View style={styles.headerBlock}>
          <View style={styles.headerTopRow}>
            {/* Grid icon */}
            <TouchableOpacity style={styles.gridIconButton} activeOpacity={0.8}>
              <Text style={styles.gridIconText}>∷</Text>
            </TouchableOpacity>

            {/* Profile Avatar */}
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={handleMyProfilePress}
              activeOpacity={0.85}
            >
              <Text style={styles.avatarEmoji}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Overlapping Cream/Peach Welcome Card */}
        <View style={styles.welcomeHeroCard}>
          {/* Decorative background circles matching reference image */}
          <View style={[styles.decorCircle, styles.decorCircleIndigo]} />
          <View style={[styles.decorCircle, styles.decorCircleYellow]} />
          <View style={[styles.decorCircle, styles.decorCirclePink]} />

          <Text style={styles.welcomeSubtext}>Welcome,</Text>
          <Text style={styles.welcomeTitle}>Find your dream Network!</Text>
        </View>

        {/* Explore Categories Horizontal Bar */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Explore Categories</Text>
          <Text style={styles.threeDotsIcon}>•••</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {/* IT / Devs (Active Category) */}
          <View style={styles.categoryItem}>
            <View style={[styles.categoryIconCircle, styles.activeCategoryCircle]}>
              <Text style={styles.activeCategoryEmoji}>💻</Text>
            </View>
            <Text style={[styles.categoryText, styles.activeCategoryText]}>IT / Devs</Text>
          </View>

          {/* Designers */}
          <View style={styles.categoryItem}>
            <View style={styles.categoryIconCircle}>
              <Text style={styles.categoryEmoji}>🎨</Text>
            </View>
            <Text style={styles.categoryText}>Designers</Text>
          </View>

          {/* AI */}
          <View style={styles.categoryItem}>
            <View style={styles.categoryIconCircle}>
              <Text style={styles.categoryEmoji}>🤖</Text>
            </View>
            <Text style={styles.categoryText}>AI & ML</Text>
          </View>

          {/* Startups */}
          <View style={styles.categoryItem}>
            <View style={styles.categoryIconCircle}>
              <Text style={styles.categoryEmoji}>🚀</Text>
            </View>
            <Text style={styles.categoryText}>Startups</Text>
          </View>

          {/* More */}
          <View style={styles.categoryItem}>
            <View style={styles.categoryIconCircle}>
              <Text style={styles.categoryEmoji}>⚡</Text>
            </View>
            <Text style={styles.categoryText}>More</Text>
          </View>
        </ScrollView>

        {/* MY TECHPASS INTEGRATED SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>My TechPass</Text>
          <Text style={styles.threeDotsIcon}>•••</Text>
        </View>

        <TouchableOpacity
          style={styles.techPassCard}
          onPress={handleMyProfilePress}
          activeOpacity={0.9}
        >
          <View style={styles.techPassIconCircle}>
            <Text style={styles.techPassBadgeEmoji}>🪪</Text>
          </View>

          <View style={styles.techPassInfoGroup}>
            <Text style={styles.techPassTitle}>Your TechPass</Text>
            <Text style={styles.techPassSubtitle}>Share your profile instantly</Text>
          </View>

          <View style={styles.techPassCtaBtn}>
            <Text style={styles.techPassCtaText}>View →</Text>
          </View>
        </TouchableOpacity>

        {/* QR Action Buttons */}
        <View style={styles.qrActionsRow}>
          <TouchableOpacity
            style={[styles.qrBtn, styles.qrBtnPrimary]}
            onPress={handleQRPress}
            activeOpacity={0.85}
          >
            <Text style={styles.qrBtnIcon}>🏁</Text>
            <Text style={styles.qrBtnLabelPrimary}>My QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.qrBtn, styles.qrBtnOutline]}
            onPress={handleScanQRPress}
            activeOpacity={0.85}
          >
            <Text style={styles.qrBtnIcon}>📷</Text>
            <Text style={[styles.qrBtnLabel, { color: '#4F46E5' }]}>Scan QR</Text>
          </TouchableOpacity>
        </View>

        {/* Discover Nearby Professionals Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>📡 Nearby Professionals</Text>
          {nearbyUsers.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{nearbyUsers.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.listContainer}>
          {/* Permission Gate */}
          <PermissionGate
            permissions={permissions}
            onRequestPermissions={requestPermissionsAndStart}
          />

          {/* Error Banner */}
          <ErrorBanner message={errorMessage} onDismiss={clearError} type="error" />

          {/* Nearby Users List */}
          <UserList
            users={nearbyUsers}
            onUserPress={handleUserPress}
            isScanning={scanningStatus === 'scanning'}
          />
        </View>
      </ScrollView>

      {/* Proximity Modal (< 12 cm) */}
      <ProximityModal
        user={proximityUser}
        visible={!!proximityUser}
        onViewProfile={handleViewProximityProfile}
        onDismiss={handleDismissProximity}
      />

      {/* Mutual Consent Modal */}
      <ConsentModal
        visible={!!consentPeer}
        peerProfile={consentPeer}
        onAccept={handleAcceptConsent}
        onDecline={handleDeclineConsent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerBlock: {
    backgroundColor: '#4F46E5',
    height: 140,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIconText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE57E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  welcomeHeroCard: {
    backgroundColor: '#FDECDA',
    borderRadius: 32,
    marginHorizontal: 18,
    marginTop: -54,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  decorCircleIndigo: {
    width: 84,
    height: 84,
    backgroundColor: '#4F46E5',
    top: -18,
    right: 44,
    opacity: 0.9,
  },
  decorCircleYellow: {
    width: 64,
    height: 64,
    backgroundColor: '#FEE57E',
    top: 14,
    right: -10,
    opacity: 0.95,
  },
  decorCirclePink: {
    width: 26,
    height: 26,
    backgroundColor: '#FF94A4',
    top: 86,
    right: 50,
    opacity: 0.9,
  },
  welcomeSubtext: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    lineHeight: 32,
    marginBottom: 20,
    maxWidth: '75%',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginTop: 24,
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  threeDotsIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9CA3AF',
    letterSpacing: 2,
  },
  categoriesScroll: {
    paddingHorizontal: 18,
    gap: 14,
    paddingBottom: 4,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 4,
  },
  categoryIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  activeCategoryCircle: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  activeCategoryEmoji: {
    fontSize: 22,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeCategoryText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  techPassCard: {
    backgroundColor: '#F4F3FA',
    borderRadius: 24,
    marginHorizontal: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  techPassIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  techPassBadgeEmoji: {
    fontSize: 24,
  },
  techPassInfoGroup: {
    flex: 1,
  },
  techPassTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  techPassSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  techPassCtaBtn: {
    backgroundColor: '#FEE57E',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
  },
  techPassCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  countBadge: {
    backgroundColor: '#FEE57E',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  listContainer: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  // ── QR Action Buttons ──────────────────────────────────────────────────────
  qrActionsRow: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: 6,
    gap: 10,
  },
  qrBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
  },
  qrBtnPrimary: {
    backgroundColor: '#4F46E5',
  },
  qrBtnOutline: {
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    backgroundColor: 'transparent',
  },
  qrBtnIcon: {
    fontSize: 15,
  },
  qrBtnLabelPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  qrBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});
