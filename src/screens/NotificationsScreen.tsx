/**
 * NotificationsScreen — System Notifications Feed with Read/Unread management.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import NotificationService from '../services/notification/NotificationService';
import AuthService from '../services/auth/AuthService';
import * as ProfileStore from '../services/profile/ProfileStore';
import { TechiesNotification } from '../types/NotificationTypes';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const isFocused = useIsFocused();

  const [notifications, setNotifications] = useState<TechiesNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const ownProf = await ProfileStore.getMyProfile();
      const session = await AuthService.getCurrentSession();
      const uid = ownProf?.deviceId || session?.uid || 'user';
      setCurrentUserId(uid);

      const list = await NotificationService.getNotifications(uid);

      // If empty, generate helpful welcome notification for demo
      if (list.length === 0) {
        await NotificationService.sendNotification(
          uid,
          'SYSTEM',
          'Welcome to Techies! ⚡',
          'Your TechPass P2P identity is active. Explore nearby Bluetooth professionals or check out local tech events.',
        );
        const updated = await NotificationService.getNotifications(uid);
        setNotifications(updated);
      } else {
        setNotifications(list);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadNotifications();
    }
  }, [isFocused, loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    await NotificationService.markAsRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!currentUserId) return;
    await NotificationService.markAllAsRead(currentUserId);
    loadNotifications();
  };

  const handleNotificationPress = async (item: TechiesNotification) => {
    await NotificationService.markAsRead(item.id);
    if (item.targetScreen) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigation.navigate(item.targetScreen as any, item.targetParams);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount} Unread</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      <View style={styles.container}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color="#4F46E5" size="large" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIconEmoji}>🔔</Text>
            </View>
            <Text style={styles.emptyTitle}>No Notifications Yet</Text>
            <Text style={styles.emptySub}>
              Connection requests, event check-ins, and system alerts will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.notifCard, !item.read && styles.unreadNotifCard]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.85}
              >
                <View style={styles.notifHeaderRow}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{item.type}</Text>
                  </View>
                  <Text style={styles.timeText}>
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody}>{item.message}</Text>

                {!item.read && (
                  <TouchableOpacity
                    style={styles.markReadPill}
                    onPress={() => handleMarkAsRead(item.id)}
                  >
                    <Text style={styles.markReadText}>Mark as Read ✓</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  header: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 10,
  },
  unreadBadge: {
    backgroundColor: '#FEE57E',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  markAllBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingTop: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F4F3FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  unreadNotifCard: {
    backgroundColor: '#F4F3FA',
    borderColor: '#4F46E5',
    borderWidth: 1.5,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  notifBody: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 8,
  },
  markReadPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginTop: 4,
  },
  markReadText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
});
