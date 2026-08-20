/**
 * Notification Domain Types for Techies Application.
 */

export type NotificationType =
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'EVENT_REGISTRATION'
  | 'EVENT_APPROVED'
  | 'EVENT_REJECTED'
  | 'EVENT_CHANGE'
  | 'EVENT_REMINDER'
  | 'CHECKIN_UPDATE'
  | 'SYSTEM';

export interface TechiesNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
  targetScreen?: string;
  targetParams?: Record<string, unknown>;
}

export interface NotificationPreferences {
  enableConnectionAlerts: boolean;
  enableEventAlerts: boolean;
  enableCheckInAlerts: boolean;
  enableMarketing: boolean;
}
