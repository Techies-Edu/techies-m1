/**
 * ConnectionService — Persists, manages, and searches user connections.
 *
 * Rules:
 * - Prevents duplicate connections.
 * - Saves sanitized TechPass snapshot at time of connection.
 * - Methods: Bluetooth, QR, NFC.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Connection, ConnectionMethod } from '../../types/ConnectionTypes';
import { UserProfile } from '../../types/ProfileTypes';
import PrivacyService from '../profile/PrivacyService';
import LogService from '../LogService';

const TAG = 'ConnectionService';
const CONNECTIONS_KEY = '@meshconnect_connections';

class ConnectionService {
  private static instance: ConnectionService;

  static getInstance(): ConnectionService {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService();
    }
    return ConnectionService.instance;
  }

  async getConnections(): Promise<Connection[]> {
    try {
      const raw = await AsyncStorage.getItem(CONNECTIONS_KEY);
      if (!raw) return [];
      const list: Connection[] = JSON.parse(raw);
      return list.sort((a, b) => b.connectedAt - a.connectedAt);
    } catch (err) {
      LogService.error(TAG, 'Failed to load connections', err);
      return [];
    }
  }

  async addConnection(
    peerProfile: UserProfile,
    method: ConnectionMethod,
  ): Promise<{ success: boolean; connection?: Connection; isDuplicate?: boolean }> {
    const list = await this.getConnections();

    // Check duplicate
    const existing = list.find((c) => c.peerUserId === peerProfile.deviceId);
    if (existing) {
      LogService.info(TAG, `Connection already exists with peer ${peerProfile.deviceId}`);
      return { success: true, connection: existing, isDuplicate: true };
    }

    // Apply privacy filter to snapshot before saving
    const sanitizedSnapshot = PrivacyService.sanitizeProfile(peerProfile, false);

    const newConn: Connection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      peerUserId: peerProfile.deviceId,
      connectedAt: Date.now(),
      method,
      snapshot: sanitizedSnapshot,
    };

    list.unshift(newConn);
    await AsyncStorage.setItem(CONNECTIONS_KEY, JSON.stringify(list));
    LogService.info(TAG, `Connection added via ${method} with ${peerProfile.displayName}`);

    return { success: true, connection: newConn, isDuplicate: false };
  }

  async removeConnection(connectionId: string): Promise<boolean> {
    try {
      const list = await this.getConnections();
      const updated = list.filter((c) => c.id !== connectionId);
      await AsyncStorage.setItem(CONNECTIONS_KEY, JSON.stringify(updated));
      LogService.info(TAG, `Connection removed: ${connectionId}`);
      return true;
    } catch (err) {
      LogService.error(TAG, 'Failed to remove connection', err);
      return false;
    }
  }

  async searchConnections(query: string): Promise<Connection[]> {
    const list = await this.getConnections();
    if (!query.trim()) return list;

    const q = query.trim().toLowerCase();
    return list.filter((c) => {
      const p = c.snapshot;
      return (
        p.displayName.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.headline.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }
}

export default ConnectionService.getInstance();
