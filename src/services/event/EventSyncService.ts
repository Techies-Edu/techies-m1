/**
 * EventSyncService — Real-time Event Synchronization & Offline Cache Manager.
 * Handles local caching, offline detection, background synchronization, and
 * safe conflict resolution (using server updatedAt timestamps).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackendEventStore from './BackendEventStore';
import { TechiesEvent, EventRegistration } from '../../types/EventTypes';
import LogService from '../LogService';

const TAG = 'EventSyncService';
const CACHE_EVENTS_KEY = '@meshconnect_cached_events';
const CACHE_REGISTRATIONS_KEY = '@meshconnect_cached_registrations';
const LAST_SYNC_KEY = '@meshconnect_last_events_sync';

type SyncListener = (isOffline: boolean) => void;

class EventSyncService {
  private static instance: EventSyncService;

  private isOfflineMode = false;
  private syncListeners: Set<SyncListener> = new Set();

  static getInstance(): EventSyncService {
    if (!EventSyncService.instance) {
      EventSyncService.instance = new EventSyncService();
    }
    return EventSyncService.instance;
  }

  constructor() {
    // Subscribe to BackendEventStore changes to auto-update local cache
    BackendEventStore.subscribeEvents((events) => {
      this.updateLocalEventsCache(events);
    });
    BackendEventStore.subscribeRegistrations((regs) => {
      this.updateLocalRegistrationsCache(regs);
    });
  }

  public setOfflineMode(offline: boolean) {
    this.isOfflineMode = offline;
    this.notifySyncListeners(offline);
    LogService.info(TAG, `Offline mode toggled: ${offline}`);
  }

  public isOffline(): boolean {
    return this.isOfflineMode;
  }

  /**
   * Synchronizes local cache with backend store.
   * Compares server `updatedAt` timestamps to prevent overwriting newer server data.
   */
  async syncEvents(): Promise<{ events: TechiesEvent[]; isOffline: boolean }> {
    try {
      if (this.isOfflineMode) {
        const cached = await this.getCachedEvents();
        return { events: cached, isOffline: true };
      }

      // Fetch latest from backend store
      const serverEvents = await BackendEventStore.fetchEvents();
      const localEvents = await this.getCachedEvents();

      // Merge using timestamp check (server data takes precedence if newer)
      const eventMap = new Map<string, TechiesEvent>();

      for (const le of localEvents) {
        eventMap.set(le.id, le);
      }

      for (const se of serverEvents) {
        const existing = eventMap.get(se.id);
        if (!existing || se.updatedAt >= existing.updatedAt) {
          eventMap.set(se.id, se);
        }
      }

      const merged = Array.from(eventMap.values()).sort((a, b) => b.createdAt - a.createdAt);
      await this.updateLocalEventsCache(merged);
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

      return { events: merged, isOffline: false };
    } catch (err) {
      LogService.warn(TAG, 'Network sync failed, falling back to local cache', err);
      const cached = await this.getCachedEvents();
      return { events: cached, isOffline: true };
    }
  }

  async getCachedEvents(): Promise<TechiesEvent[]> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_EVENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  private async updateLocalEventsCache(events: TechiesEvent[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_EVENTS_KEY, JSON.stringify(events));
    } catch (_) {}
  }

  async getCachedRegistrations(): Promise<EventRegistration[]> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_REGISTRATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  private async updateLocalRegistrationsCache(regs: EventRegistration[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_REGISTRATIONS_KEY, JSON.stringify(regs));
    } catch (_) {}
  }

  subscribeSyncStatus(listener: SyncListener): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  private notifySyncListeners(offline: boolean) {
    this.syncListeners.forEach((l) => l(offline));
  }
}

export default EventSyncService.getInstance();
