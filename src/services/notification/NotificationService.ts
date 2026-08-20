/**
 * NotificationService — System Notifications queue & preferences manager.
 *
 * Persists notifications and preferences to AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TechiesNotification,
  NotificationPreferences,
  NotificationType,
} from '../../types/NotificationTypes';
import LogService from '../LogService';

const TAG = 'NotificationService';
const NOTIFICATIONS_KEY = '@meshconnect_notifications';
const NOTIF_PREFS_KEY = '@meshconnect_notification_preferences';

export const DEFAULT_NOTIF_PREFERENCES: NotificationPreferences = {
  enableConnectionAlerts: true,
  enableEventAlerts: true,
  enableCheckInAlerts: true,
  enableMarketing: false,
};

class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
      return raw ? JSON.parse(raw) : { ...DEFAULT_NOTIF_PREFERENCES };
    } catch (_) {
      return { ...DEFAULT_NOTIF_PREFERENCES };
    }
  }

  async updatePreferences(
    prefs: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(updated));
    LogService.info(TAG, 'Notification preferences updated');
    return updated;
  }

  async getNotifications(userId: string): Promise<TechiesNotification[]> {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (!raw) return [];
      const list: TechiesNotification[] = JSON.parse(raw);
      return list.filter((n) => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      LogService.error(TAG, 'Failed to fetch notifications', err);
      return [];
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const list = await this.getNotifications(userId);
    return list.filter((n) => !n.read).length;
  }

  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    targetScreen?: string,
    targetParams?: Record<string, unknown>,
  ): Promise<TechiesNotification | null> {
    const prefs = await this.getPreferences();

    // Check preferences
    if (type.startsWith('CONNECTION') && !prefs.enableConnectionAlerts) return null;
    if (type.startsWith('EVENT') && !prefs.enableEventAlerts) return null;
    if (type.startsWith('CHECKIN') && !prefs.enableCheckInAlerts) return null;

    try {
      const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      const list: TechiesNotification[] = raw ? JSON.parse(raw) : [];

      const newNotif: TechiesNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        type,
        title,
        message,
        read: false,
        createdAt: Date.now(),
        targetScreen,
        targetParams,
      };

      list.unshift(newNotif);
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
      LogService.info(TAG, `Notification sent to ${userId}: ${title}`);
      return newNotif;
    } catch (err) {
      LogService.error(TAG, 'Failed to send notification', err);
      return null;
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (!raw) return false;
      const list: TechiesNotification[] = JSON.parse(raw);
      const idx = list.findIndex((n) => n.id === notificationId);
      if (idx !== -1) {
        list[idx].read = true;
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (!raw) return false;
      const list: TechiesNotification[] = JSON.parse(raw);
      list.forEach((n) => {
        if (n.userId === userId) n.read = true;
      });
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
      return true;
    } catch (_) {
      return false;
    }
  }
}

export default NotificationService.getInstance();
