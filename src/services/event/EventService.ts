/**
 * EventService — Primary Facade for Event Management & Member Registrations.
 * Routes operations through BackendEventStore and EventSyncService with authorization,
 * capacity checks, duplicate registration prevention, and offline caching.
 */
import BackendEventStore from './BackendEventStore';
import EventSyncService from './EventSyncService';
import { TechiesEvent, EventRegistration, RegistrationStatus } from '../../types/EventTypes';
import { UserProfile } from '../../types/ProfileTypes';
import LogService from '../LogService';

const TAG = 'EventService';

class EventService {
  private static instance: EventService;

  static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  /**
   * Retrieves events with offline cache fallback.
   */
  async getEvents(): Promise<TechiesEvent[]> {
    const { events } = await EventSyncService.syncEvents();
    return events;
  }

  async getEventById(eventId: string): Promise<TechiesEvent | null> {
    const events = await this.getEvents();
    return events.find((e) => e.id === eventId) || null;
  }

  /**
   * Creates a new event via BackendEventStore.
   */
  async createEvent(
    organizerId: string,
    organizerName: string,
    eventData: Omit<
      TechiesEvent,
      'id' | 'organizerId' | 'organizerName' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<TechiesEvent> {
    const newEvent = await BackendEventStore.createEvent(organizerId, organizerName, eventData);
    LogService.info(TAG, `Event created: ${newEvent.title} (${newEvent.id})`);
    return newEvent;
  }

  /**
   * Updates an event with authorization check (only event organizer can edit).
   */
  async updateEvent(
    userUid: string,
    eventId: string,
    patch: Partial<Omit<TechiesEvent, 'id' | 'organizerId' | 'createdAt'>>,
  ): Promise<{ success: boolean; event?: TechiesEvent; error?: string }> {
    return BackendEventStore.updateEvent(userUid, eventId, patch);
  }

  /**
   * Deletes an event with authorization check (only event organizer can delete).
   */
  async deleteEvent(
    userUid: string,
    eventId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return BackendEventStore.deleteEvent(userUid, eventId);
  }

  // ── Registrations Management ────────────────────────────────────────────────

  async getRegistrations(): Promise<EventRegistration[]> {
    return BackendEventStore.fetchRegistrations();
  }

  async getRegistrationsForEvent(eventId: string): Promise<EventRegistration[]> {
    const regs = await this.getRegistrations();
    return regs.filter((r) => r.eventId === eventId);
  }

  async getUserRegistrations(userId: string): Promise<EventRegistration[]> {
    const regs = await this.getRegistrations();
    return regs.filter((r) => r.userId === userId);
  }

  /**
   * Registers a user for an event using their real TechPass identity.
   * Enforces capacity constraints and duplicate registration checks.
   */
  async registerForEvent(
    eventId: string,
    userProfile: UserProfile,
  ): Promise<{ success: boolean; registration?: EventRegistration; error?: string }> {
    return BackendEventStore.registerUser(eventId, userProfile);
  }

  /**
   * Updates registration status (Approved/Rejected/Checked In) with organizer authorization check.
   */
  async updateRegistrationStatus(
    userUid: string,
    registrationId: string,
    status: RegistrationStatus,
  ): Promise<{ success: boolean; error?: string }> {
    return BackendEventStore.updateRegistrationStatus(userUid, registrationId, status);
  }

  /**
   * Cancels a user's registration.
   */
  async cancelRegistration(
    userUid: string,
    eventId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return BackendEventStore.cancelRegistration(userUid, eventId);
  }
}

export default EventService.getInstance();
