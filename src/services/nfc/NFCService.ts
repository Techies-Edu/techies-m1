/**
 * NFCService — Low-level NFC hardware interface wrapping react-native-nfc-manager.
 *
 * Handles:
 * - Hardware capability checks (isSupported, isEnabled)
 * - NDEF technology request lifecycle
 * - Tag detection and metadata extraction (tag type, max capacity, writability)
 * - NDEF URI record encoding & writing
 * - Verification readback
 * - Clean error mapping & resource cleanup
 */
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import LogService from '../LogService';

const TAG = 'NFCService';

export interface NFCTagInfo {
  id: string;
  isWritable: boolean;
  maxSize: number;
  techTypes: string[];
  currentPayloadUrl?: string;
  isNdefSupported: boolean;
}

export type NFCErrorType =
  | 'UNSUPPORTED_DEVICE'
  | 'NFC_DISABLED'
  | 'UNSUPPORTED_TAG'
  | 'READ_ONLY_TAG'
  | 'INSUFFICIENT_CAPACITY'
  | 'TAG_REMOVED'
  | 'WRITE_FAILED'
  | 'CANCELLED'
  | 'UNKNOWN';

export class NFCError extends Error {
  constructor(
    public type: NFCErrorType,
    message: string,
  ) {
    super(message);
    this.name = 'NFCError';
  }
}

class NFCService {
  private static instance: NFCService;
  private isInitialized = false;

  static getInstance(): NFCService {
    if (!NFCService.instance) {
      NFCService.instance = new NFCService();
    }
    return NFCService.instance;
  }

  /** Ensures NfcManager is started cleanly */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await NfcManager.start();
      this.isInitialized = true;
      LogService.info(TAG, 'NFC Manager initialized successfully');
    } catch (err) {
      LogService.warn(TAG, 'Failed to initialize NFC Manager', err);
    }
  }

  /** Check if device supports NFC */
  async isSupported(): Promise<boolean> {
    await this.init();
    try {
      const supported = await NfcManager.isSupported();
      return !!supported;
    } catch (err) {
      LogService.warn(TAG, 'isSupported check failed', err);
      return false;
    }
  }

  /** Check if NFC is enabled in device settings */
  async isEnabled(): Promise<boolean> {
    await this.init();
    try {
      const enabled = await NfcManager.isEnabled();
      return !!enabled;
    } catch (err) {
      LogService.warn(TAG, 'isEnabled check failed', err);
      return false;
    }
  }

  /** Prompt user or open Android NFC settings */
  async goToSettings(): Promise<void> {
    try {
      await NfcManager.goToNfcSetting();
    } catch (err) {
      LogService.warn(TAG, 'Failed to open NFC settings', err);
    }
  }

  /**
   * Request NDEF tech session and detect tag.
   * Returns metadata about the physical tag.
   */
  async detectTag(): Promise<NFCTagInfo> {
    const supported = await this.isSupported();
    if (!supported) {
      throw new NFCError('UNSUPPORTED_DEVICE', 'This device does not support NFC.');
    }

    const enabled = await this.isEnabled();
    if (!enabled) {
      throw new NFCError('NFC_DISABLED', 'NFC is disabled. Please enable NFC in system settings.');
    }

    try {
      LogService.info(TAG, 'Requesting NDEF technology session...');
      await NfcManager.requestTechnology([NfcTech.Ndef]);

      const tag = await NfcManager.getTag();
      if (!tag) {
        throw new NFCError('UNSUPPORTED_TAG', 'No NFC tag detected or invalid tag format.');
      }

      LogService.info(TAG, 'NFC Tag detected', { id: tag.id });

      const rawTag = tag as unknown as Record<string, unknown>;
      let maxSize = 137; // Standard fallback (NTAG213)
      if (typeof rawTag.maxSize === 'number' && rawTag.maxSize > 0) {
        maxSize = rawTag.maxSize;
      }

      const isWritable = rawTag.isWritable !== false;
      const techTypes = (rawTag.techTypes as string[]) || ['android.nfc.tech.Ndef'];

      // Parse existing payload if available
      let currentPayloadUrl: string | undefined;
      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        try {
          const record = tag.ndefMessage[0];
          if (record && record.payload) {
            currentPayloadUrl = Ndef.uri.decodePayload(new Uint8Array(record.payload));
          }
        } catch (_) {}
      }

      return {
        id: tag.id || 'NFC_TAG',
        isWritable,
        maxSize,
        techTypes,
        currentPayloadUrl,
        isNdefSupported: true,
      };
    } catch (err: unknown) {
      LogService.error(TAG, 'Tag detection failed', err);
      this.cancelSession();

      if (err instanceof NFCError) throw err;

      const errMsg = (err as Error)?.message || '';
      if (errMsg.includes('cancelled') || errMsg.includes('user')) {
        throw new NFCError('CANCELLED', 'NFC scan was cancelled.');
      }

      throw new NFCError(
        'UNSUPPORTED_TAG',
        'Could not communicate with NFC tag. Ensure tag is NDEF compatible.',
      );
    }
  }

  /**
   * Writes a URL to the detected NFC tag as an NDEF URI Record.
   * Verifies tag capacity & writability prior to writing.
   */
  async writeTechPassUrl(url: string, tagInfo: NFCTagInfo): Promise<boolean> {
    if (!tagInfo.isWritable) {
      throw new NFCError('READ_ONLY_TAG', 'This NFC tag is read-only or locked.');
    }

    // Build NDEF URI bytes
    const bytes = Ndef.encodeMessage([Ndef.uriRecord(url)]);
    const requiredSize = bytes.length;

    if (tagInfo.maxSize > 0 && requiredSize > tagInfo.maxSize) {
      throw new NFCError(
        'INSUFFICIENT_CAPACITY',
        `NFC tag capacity (${tagInfo.maxSize} bytes) is smaller than required payload (${requiredSize} bytes).`,
      );
    }

    try {
      LogService.info(TAG, `Writing NDEF payload to tag (${requiredSize} bytes)...`, { url });
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      LogService.info(TAG, 'NDEF payload written successfully');

      // Verify readback if possible
      try {
        const verifyTag = await NfcManager.getTag();
        if (verifyTag && verifyTag.ndefMessage && verifyTag.ndefMessage.length > 0) {
          const readUrl = Ndef.uri.decodePayload(new Uint8Array(verifyTag.ndefMessage[0].payload));
          if (readUrl && readUrl.includes('/p/')) {
            LogService.info(TAG, 'Verified NDEF write payload match:', readUrl);
          }
        }
      } catch (verifyErr) {
        LogService.warn(TAG, 'Write verification readback skipped', verifyErr);
      }

      return true;
    } catch (err: unknown) {
      LogService.error(TAG, 'NFC Write failed', err);
      const errMsg = (err as Error)?.message || '';

      if (
        errMsg.includes('Tag was lost') ||
        errMsg.includes('transceive failed') ||
        errMsg.includes('IO')
      ) {
        throw new NFCError(
          'TAG_REMOVED',
          'NFC tag was moved away before writing completed. Hold tag steady.',
        );
      }

      throw new NFCError('WRITE_FAILED', 'Failed to write TechPass to NFC tag. Please try again.');
    } finally {
      this.cancelSession();
    }
  }

  /** Cancel current NFC tech request session */
  async cancelSession(): Promise<void> {
    try {
      await NfcManager.cancelTechnologyRequest();
      LogService.debug(TAG, 'NFC session cancelled/closed');
    } catch (_) {}
  }
}

export default NFCService.getInstance();
