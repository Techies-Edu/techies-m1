/**
 * CheckInService — Real Bluetooth & QR Event Check-In Engine.
 *
 * Responsibilities:
 * - Manages active Organizer Check-In mode sessions
 * - Verifies event ID, attendee registration status, organizer authority, and prevents duplicates
 * - Records CheckInRecord with timestamp and method ('BLUETOOTH' | 'MANUAL' | 'QR')
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckInRecord, CheckInMethod } from '../../types/EventTypes';
import EventService from './EventService';
import LogService from '../LogService';

const TAG = 'CheckInService';
const CHECKIN_RECORDS_KEY = '@meshconnect_checkin_records';
const ACTIVE_ORGANIZER_SESSION_KEY = '@meshconnect_active_organizer_checkin';

export interface ActiveCheckInSession {
  eventId: string;
  organizerId: string;
  startedAt: number;
}

class CheckInService {
  private static instance: CheckInService;

  static getInstance(): CheckInService {
    if (!CheckInService.instance) {
      CheckInService.instance = new CheckInService();
    }
    return CheckInService.instance;
  }

  /** Organizer opens Event Check-in Mode */
  async startOrganizerCheckInMode(
    eventId: string,
    organizerId: string,
  ): Promise<ActiveCheckInSession> {
    const session: ActiveCheckInSession = {
      eventId,
      organizerId,
      startedAt: Date.now(),
    };
    await AsyncStorage.setItem(ACTIVE_ORGANIZER_SESSION_KEY, JSON.stringify(session));
    LogService.info(TAG, `Organizer ${organizerId} started Check-in Mode for event ${eventId}`);
    return session;
  }

  /** Organizer stops Check-in Mode */
  async stopOrganizerCheckInMode(): Promise<void> {
    await AsyncStorage.removeItem(ACTIVE_ORGANIZER_SESSION_KEY);
    LogService.info(TAG, 'Organizer Check-in Mode stopped');
  }

  /** Get active organizer check-in session */
  async getActiveOrganizerSession(): Promise<ActiveCheckInSession | null> {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_ORGANIZER_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  /** Fetch all check-in records */
  async getCheckInRecords(): Promise<CheckInRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(CHECKIN_RECORDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Executes event check-in for an attendee.
   * Checks event validity, registration status, authorization, and prevents duplicates.
   */
  async processCheckIn(
    eventId: string,
    attendeeUserId: string,
    organizerUserId: string,
    method: CheckInMethod = 'BLUETOOTH',
  ): Promise<{ success: boolean; record?: CheckInRecord; error?: string }> {
    LogService.info(
      TAG,
      `Attempting ${method} check-in for user ${attendeeUserId} on event ${eventId}...`,
    );

    // 1. Verify Event existence
    const event = await EventService.getEventById(eventId);
    if (!event) {
      return { success: false, error: 'Invalid Event ID.' };
    }

    // 2. Verify Organizer Authorization
    if (event.organizerId !== organizerUserId) {
      return {
        success: false,
        error: 'Unauthorized. Only the event organizer can process check-in.',
      };
    }

    // 3. Verify Attendee Registration
    const regs = await EventService.getRegistrationsForEvent(eventId);
    const reg = regs.find((r) => r.userId === attendeeUserId);

    if (!reg) {
      return { success: false, error: 'No registration found for this user.' };
    }

    if (reg.status === 'Cancelled' || reg.status === 'Rejected') {
      return { success: false, error: `Registration status is ${reg.status}. Cannot check in.` };
    }

    if (reg.status === 'Checked In') {
      return { success: false, error: 'Attendee is already checked in to this event.' };
    }

    // 4. Update Registration Status to Checked In
    await EventService.updateRegistrationStatus(organizerUserId, reg.id, 'Checked In');

    // 5. Create CheckInRecord
    const records = await this.getCheckInRecords();
    const newRecord: CheckInRecord = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      attendeeId: attendeeUserId,
      organizerId: organizerUserId,
      timestamp: Date.now(),
      method,
    };

    records.push(newRecord);
    await AsyncStorage.setItem(CHECKIN_RECORDS_KEY, JSON.stringify(records));

    LogService.info(
      TAG,
      `Check-in SUCCESS: Attendee ${attendeeUserId} checked into ${event.title}`,
    );
    return { success: true, record: newRecord };
  }
}

export default CheckInService.getInstance();
