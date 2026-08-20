/**
 * Event Domain Types for Techies Application.
 */
import { UserProfile } from './ProfileTypes';

export type EventRsvpMode = 'AUTO' | 'MANUAL_APPROVAL';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

export type RegistrationStatus =
  'Not Registered' | 'Pending' | 'Approved' | 'Rejected' | 'Checked In' | 'Cancelled';

export type CheckInMethod = 'BLUETOOTH' | 'MANUAL' | 'QR';

export interface TechiesEvent {
  id: string;
  organizerId: string;
  organizerName: string;
  title: string;
  description: string;
  bannerUrl: string;
  theme: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  rsvpMode: EventRsvpMode;
  eventStatus: EventStatus;
  website?: string;
  contact?: string;
  categories?: string[];
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  techPassSnapshot: UserProfile;
  status: RegistrationStatus;
  registeredAt: number;
  checkedInAt?: number;
  checkedInMethod?: CheckInMethod;
}

export interface CheckInRecord {
  id: string;
  eventId: string;
  attendeeId: string;
  organizerId: string;
  timestamp: number;
  method: CheckInMethod;
}
