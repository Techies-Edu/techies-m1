/**
 * WifiDirectService — React Native bridge & orchestration for Wi-Fi Direct P2P transport.
 *
 * Responsibilities:
 *   - High-speed peer-to-peer profile transfer over Wi-Fi Direct (port 8888)
 *   - Serves own profile JSON over P2P socket
 *   - Provides fetchProfileOverWifiDirect() with automatic error handling & fallback to BLE GATT
 */
import { NativeModules, Platform } from 'react-native';
import { UserProfile } from '../../types/ProfileTypes';
import LogService from '../LogService';

const TAG = 'WifiDirectService';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NativeWifiDirect = NativeModules.WifiDirectModule as any;

class WifiDirectService {
  private static instance: WifiDirectService;
  private isServerRunning = false;

  static getInstance(): WifiDirectService {
    if (!WifiDirectService.instance) {
      WifiDirectService.instance = new WifiDirectService();
    }
    return WifiDirectService.instance;
  }

  /** Starts native Wi-Fi Direct P2P socket server */
  async startServer(): Promise<void> {
    if (Platform.OS !== 'android' || !NativeWifiDirect) return;
    if (this.isServerRunning) return;

    try {
      await NativeWifiDirect.startP2pServer();
      this.isServerRunning = true;
      LogService.info(TAG, 'Wi-Fi Direct P2P server started successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      LogService.warn(TAG, `Failed to start Wi-Fi Direct server: ${msg}`);
    }
  }

  /** Updates the profile JSON served over Wi-Fi Direct socket */
  async setProfileData(profile: UserProfile): Promise<void> {
    if (Platform.OS !== 'android' || !NativeWifiDirect) return;

    try {
      await NativeWifiDirect.setProfileData(JSON.stringify(profile));
      LogService.debug(TAG, 'Updated Wi-Fi Direct profile payload');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      LogService.warn(TAG, `setProfileData Wi-Fi Direct failed: ${msg}`);
    }
  }

  /**
   * Attempts to fetch peer profile over Wi-Fi Direct.
   * Throws error if Wi-Fi Direct is unavailable or times out,
   * triggering seamless automatic fallback to BLE GATT sync.
   */
  async fetchProfile(hostIp?: string): Promise<UserProfile> {
    if (Platform.OS !== 'android' || !NativeWifiDirect) {
      throw new Error('Wi-Fi Direct not supported on this platform');
    }

    LogService.info(TAG, 'Attempting high-speed profile fetch over Wi-Fi Direct...');
    const jsonStr = await NativeWifiDirect.fetchProfileOverWifiDirect(hostIp || '192.168.49.1');

    if (!jsonStr) {
      throw new Error('Empty Wi-Fi Direct payload received');
    }

    const profile = JSON.parse(jsonStr) as UserProfile;
    if (!profile || !profile.deviceId) {
      throw new Error('Invalid Wi-Fi Direct profile structure');
    }

    LogService.info(
      TAG,
      `Successfully fetched profile over Wi-Fi Direct for ${profile.displayName}`,
    );
    return profile;
  }

  /** Stops Wi-Fi Direct server socket */
  async stopServer(): Promise<void> {
    if (Platform.OS !== 'android' || !NativeWifiDirect) return;

    try {
      await NativeWifiDirect.cancelP2pServer();
      this.isServerRunning = false;
      LogService.info(TAG, 'Wi-Fi Direct server stopped');
    } catch (_) {}
  }
}

export default WifiDirectService.getInstance();
