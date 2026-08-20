/**
 * BackendEventStore — Shared Persistent Backend Storage & Remote DB Simulation.
 * Serves as the authoritative source of truth for events, registrations, and capacity tracking.
 * Implements persistent storage, listener broadcasts, and backend authorization rules.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TechiesEvent, EventRegistration, RegistrationStatus } from '../../types/EventTypes';
import { UserProfile } from '../../types/ProfileTypes';
import LogService from '../LogService';

const TAG = 'BackendEventStore';
const BACKEND_EVENTS_KEY = '@meshconnect_backend_events_db';
const BACKEND_REGISTRATIONS_KEY = '@meshconnect_backend_registrations_db';

type EventStoreListener = (events: TechiesEvent[]) => void;
type RegistrationListener = (registrations: EventRegistration[]) => void;

class BackendEventStore {
  private static instance: BackendEventStore;

  private eventListeners: Set<EventStoreListener> = new Set();
  private registrationListeners: Set<RegistrationListener> = new Set();

  static getInstance(): BackendEventStore {
    if (!BackendEventStore.instance) {
      BackendEventStore.instance = new BackendEventStore();
    }
    return BackendEventStore.instance;
  }

  // Initial default community events
  private getInitialDefaultEvents(): TechiesEvent[] {
    const now = Date.now();
    return [
      {
        id: 'evt_techies_summit_2026',
        organizerId: 'org_techies_lead',
        organizerName: 'Techies Global Team',
        title: 'Techies Global Summit 2026',
        description:
          'The flagship P2P networking & decentralised mobile dev conference. Connect with developers, founders, and tech leaders.',
        bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        theme: 'Offline Networking & P2P Protocols',
        venue: 'Grand Tech Expo Hall & Online',
        date: '2026-09-15',
        startTime: '10:00 AM',
        endTime: '05:00 PM',
        capacity: 250,
        rsvpMode: 'MANUAL_APPROVAL',
        eventStatus: 'PUBLISHED',
        website: 'https://techies.app/summit2026',
        contact: 'events@techies.app',
        categories: ['Conference', 'P2P', 'Mobile'],
        tags: ['BLE', 'React Native', 'Networking'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'evt_ai_hackathon',
        organizerId: 'org_ai_labs',
        organizerName: 'Decentralised AI Guild',
        title: 'AI & Peer-to-Peer Hackathon',
        description:
          '48-hour build session focused on zero-server AI agents, BLE GATT sync, and mobile-first offline intelligence.',
        bannerUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800',
        theme: 'Local LLMs & Mesh Networking',
        venue: 'Innovation Hub Basement',
        date: '2026-10-02',
        startTime: '09:00 AM',
        endTime: '09:00 PM',
        capacity: 100,
        rsvpMode: 'AUTO',
        eventStatus: 'PUBLISHED',
        website: 'https://techies.app/hackathon',
        contact: 'hack@techies.app',
        categories: ['Hackathon', 'AI', 'Open Source'],
        tags: ['Local LLMs', 'Offline AI', 'TypeScript'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'evt_rn_meetup',
        organizerId: 'org_mobile_devs',
        organizerName: 'Mobile Engineers Club',
        title: 'React Native & Mobile Architecture Night',
        description:
          'Deep dive into modern React Native, NFC NDEF payload optimization, and high-performance custom modules.',
        bannerUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
        theme: 'Mobile Systems & Performance',
        venue: 'Developer Lounge, Tower 4',
        date: '2026-08-28',
        startTime: '06:30 PM',
        endTime: '08:30 PM',
        capacity: 60,
        rsvpMode: 'AUTO',
        eventStatus: 'PUBLISHED',
        website: 'https://techies.app/rn-meetup',
        contact: 'rn@techies.app',
        categories: ['Meetup', 'Mobile', 'Engineering'],
        tags: ['React Native', 'NFC', 'Performance'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'evt_mesh_workshop',
        organizerId: 'org_mesh_labs',
        organizerName: 'Mesh Protocol Labs',
        title: 'Decentralised Web & P2P Mesh Workshop',
        description:
          'Hands-on masterclass on building zero-infrastructure mesh networks using Bluetooth Low Energy, Wi-Fi Direct, and offline cryptographic state.',
        bannerUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
        theme: 'P2P Protocols & Mesh Cryptography',
        venue: 'Tech Park Auditorium A & Remote',
        date: '2026-09-05',
        startTime: '02:00 PM',
        endTime: '06:00 PM',
        capacity: 120,
        rsvpMode: 'AUTO',
        eventStatus: 'PUBLISHED',
        website: 'https://techies.app/mesh-workshop',
        contact: 'mesh@techies.app',
        categories: ['P2P', 'Conference', 'Open Source'],
        tags: ['P2P', 'BLE', 'Cryptography'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'evt_edge_ai_summit',
        organizerId: 'org_edge_ai',
        organizerName: 'Edge AI Collective',
        title: 'Next-Gen On-Device AI & Edge Computing',
        description:
          'Explore running quantized open-weights LLMs directly on mobile chipsets with zero cloud latency.',
        bannerUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
        theme: 'Edge AI & On-Device Models',
        venue: 'Quantum Labs, 5th Floor',
        date: '2026-10-18',
        startTime: '11:00 AM',
        endTime: '04:00 PM',
        capacity: 85,
        rsvpMode: 'MANUAL_APPROVAL',
        eventStatus: 'PUBLISHED',
        website: 'https://techies.app/edge-ai',
        contact: 'ai@techies.app',
        categories: ['AI', 'Mobile', 'Conference'],
        tags: ['Edge AI', 'Local LLMs', 'Mobile'],
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  /** Fetch all events from persistent backend store */
  async fetchEvents(): Promise<TechiesEvent[]> {
    try {
      const raw = await AsyncStorage.getItem(BACKEND_EVENTS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
      const defaults = this.getInitialDefaultEvents();
      await AsyncStorage.setItem(BACKEND_EVENTS_KEY, JSON.stringify(defaults));
      return defaults;
    } catch (err) {
      LogService.error(TAG, 'Failed to fetch backend events', err);
      return [];
    }
  }

  /** Save events array to persistent backend store and notify listeners */
  private async saveEvents(events: TechiesEvent[]): Promise<void> {
    await AsyncStorage.setItem(BACKEND_EVENTS_KEY, JSON.stringify(events));
    this.notifyEventListeners(events);
  }

  /** Create a new event with authorization check */
  async createEvent(
    userUid: string,
    userName: string,
    eventData: Omit<
      TechiesEvent,
      'id' | 'organizerId' | 'organizerName' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<TechiesEvent> {
    const events = await this.fetchEvents();
    const now = Date.now();

    const newEvent: TechiesEvent = {
      ...eventData,
      id: `evt_${now}_${Math.random().toString(36).substring(2, 6)}`,
      organizerId: userUid,
      organizerName: userName || 'Organizer',
      eventStatus: eventData.eventStatus || 'PUBLISHED',
      categories: eventData.categories || ['General'],
      tags: eventData.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    events.unshift(newEvent);
    await this.saveEvents(events);
    LogService.info(TAG, `Created backend event: ${newEvent.title} (${newEvent.id})`);
    return newEvent;
  }

  /** Update event details with organizer authorization check */
  async updateEvent(
    userUid: string,
    eventId: string,
    patch: Partial<Omit<TechiesEvent, 'id' | 'organizerId' | 'createdAt'>>,
  ): Promise<{ success: boolean; event?: TechiesEvent; error?: string }> {
    const events = await this.fetchEvents();
    const idx = events.findIndex((e) => e.id === eventId);
    if (idx === -1) {
      return { success: false, error: 'Event not found.' };
    }

    // Security check: Only the event creator/organizer can edit the event
    if (events[idx].organizerId !== userUid) {
      return {
        success: false,
        error: 'Unauthorized: You can only modify events you created.',
      };
    }

    const updated: TechiesEvent = {
      ...events[idx],
      ...patch,
      updatedAt: Date.now(),
    };

    events[idx] = updated;
    await this.saveEvents(events);
    LogService.info(TAG, `Updated backend event: ${updated.title} (${updated.id})`);
    return { success: true, event: updated };
  }

  /** Delete an event with organizer authorization check */
  async deleteEvent(
    userUid: string,
    eventId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const events = await this.fetchEvents();
    const target = events.find((e) => e.id === eventId);
    if (!target) {
      return { success: false, error: 'Event not found.' };
    }

    // Security check: Only the event creator can delete the event
    if (target.organizerId !== userUid) {
      return {
        success: false,
        error: 'Unauthorized: You can only delete events you created.',
      };
    }

    const filtered = events.filter((e) => e.id !== eventId);
    await this.saveEvents(filtered);
    LogService.info(TAG, `Deleted backend event: ${eventId}`);
    return { success: true };
  }

  // ── Registration Operations ──────────────────────────────────────────────

  /** Fetch all registrations from persistent backend store */
  async fetchRegistrations(): Promise<EventRegistration[]> {
    try {
      const raw = await AsyncStorage.getItem(BACKEND_REGISTRATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  private async saveRegistrations(regs: EventRegistration[]): Promise<void> {
    await AsyncStorage.setItem(BACKEND_REGISTRATIONS_KEY, JSON.stringify(regs));
    this.notifyRegistrationListeners(regs);
  }

  /** Register user for an event with capacity & duplicate checks */
  async registerUser(
    eventId: string,
    userProfile: UserProfile,
  ): Promise<{ success: boolean; registration?: EventRegistration; error?: string }> {
    const events = await this.fetchEvents();
    const event = events.find((e) => e.id === eventId);
    if (!event) return { success: false, error: 'Event not found.' };

    if (event.eventStatus === 'CANCELLED' || event.eventStatus === 'COMPLETED') {
      return {
        success: false,
        error: `Cannot register for a ${event.eventStatus.toLowerCase()} event.`,
      };
    }

    const regs = await this.fetchRegistrations();

    // Check duplicate
    const userId = userProfile.deviceId;
    const existing = regs.find((r) => r.eventId === eventId && r.userId === userId);
    if (existing && existing.status !== 'Cancelled') {
      return { success: false, error: 'You are already registered for this event.' };
    }

    // Capacity enforcement
    const activeCount = regs.filter(
      (r) => r.eventId === eventId && (r.status === 'Approved' || r.status === 'Checked In'),
    ).length;

    if (activeCount >= event.capacity) {
      return { success: false, error: 'Event has reached maximum capacity.' };
    }

    const initialStatus: RegistrationStatus = event.rsvpMode === 'AUTO' ? 'Approved' : 'Pending';

    const newReg: EventRegistration = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      userId,
      techPassSnapshot: userProfile,
      status: initialStatus,
      registeredAt: Date.now(),
    };

    if (existing) {
      const idx = regs.findIndex((r) => r.id === existing.id);
      regs[idx] = newReg;
    } else {
      regs.push(newReg);
    }

    await this.saveRegistrations(regs);
    LogService.info(
      TAG,
      `User ${userProfile.displayName} registered for ${event.title} (${initialStatus})`,
    );
    return { success: true, registration: newReg };
  }

  /** Update registration status with organizer authorization check */
  async updateRegistrationStatus(
    userUid: string,
    registrationId: string,
    newStatus: RegistrationStatus,
  ): Promise<{ success: boolean; error?: string }> {
    const regs = await this.fetchRegistrations();
    const reg = regs.find((r) => r.id === registrationId);
    if (!reg) return { success: false, error: 'Registration not found.' };

    const events = await this.fetchEvents();
    const event = events.find((e) => e.id === reg.eventId);
    if (!event) return { success: false, error: 'Associated event not found.' };

    // Security check: Only the organizer of the event can approve/reject registrations
    if (event.organizerId !== userUid) {
      return {
        success: false,
        error: 'Unauthorized: Only the event organizer can modify registration approvals.',
      };
    }

    reg.status = newStatus;
    if (newStatus === 'Checked In' && !reg.checkedInAt) {
      reg.checkedInAt = Date.now();
    }

    await this.saveRegistrations(regs);
    LogService.info(TAG, `Updated registration ${registrationId} status to ${newStatus}`);
    return { success: true };
  }

  /** Cancel registration (user self-service) */
  async cancelRegistration(
    userUid: string,
    eventId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const regs = await this.fetchRegistrations();
    const idx = regs.findIndex((r) => r.eventId === eventId && r.userId === userUid);
    if (idx === -1) return { success: false, error: 'Active registration not found.' };

    regs[idx].status = 'Cancelled';
    await this.saveRegistrations(regs);
    LogService.info(TAG, `Registration cancelled by user ${userUid} for event ${eventId}`);
    return { success: true };
  }

  // ── Listener Subscriptions ────────────────────────────────────────────────

  subscribeEvents(listener: EventStoreListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  subscribeRegistrations(listener: RegistrationListener): () => void {
    this.registrationListeners.add(listener);
    return () => this.registrationListeners.delete(listener);
  }

  private notifyEventListeners(events: TechiesEvent[]) {
    this.eventListeners.forEach((l) => l(events));
  }

  private notifyRegistrationListeners(regs: EventRegistration[]) {
    this.registrationListeners.forEach((l) => l(regs));
  }
}

export default BackendEventStore.getInstance();
