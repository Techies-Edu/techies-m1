/**
 * Connection Domain Types for Techies Application.
 */
import { UserProfile } from './ProfileTypes';

export type ConnectionMethod = 'Bluetooth' | 'QR' | 'NFC';

export interface Connection {
  id: string;
  peerUserId: string;
  connectedAt: number;
  method: ConnectionMethod;
  /** Sanitized TechPass snapshot at connection time */
  snapshot: UserProfile;
}
