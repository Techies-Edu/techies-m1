/**
 * NFCWriter — High-level business coordinator for programming Techies TechPass onto NFC tags.
 *
 * Responsibilities:
 * - Generates canonical TechPass deep link URL (https://techies.app/p/<userId>)
 * - Coordinates NFC tag detection, safety validation, writing, and verification
 * - Manages write workflow states for the UI
 */
import NFCService, { NFCTagInfo, NFCError } from './NFCService';
import LogService from '../LogService';

const TAG = 'NFCWriter';
export const BASE_TECHPASS_URL = 'https://techies.app/p/';

export interface WriteResult {
  success: boolean;
  url: string;
  tagId: string;
  error?: string;
}

class NFCWriter {
  private static instance: NFCWriter;

  static getInstance(): NFCWriter {
    if (!NFCWriter.instance) {
      NFCWriter.instance = new NFCWriter();
    }
    return NFCWriter.instance;
  }

  /** Constructs canonical TechPass URL for a user ID */
  generateTechPassUrl(userId: string): string {
    const cleanId = encodeURIComponent(userId.trim());
    return `${BASE_TECHPASS_URL}${cleanId}`;
  }

  /**
   * Step 1: Start scanning and detect a physical NFC tag.
   * Returns tag metadata for user confirmation.
   */
  async scanForTag(): Promise<{ tagInfo: NFCTagInfo; url: string }> {
    LogService.info(TAG, 'Scanning for writable NFC tag...');
    const tagInfo = await NFCService.detectTag();
    return { tagInfo, url: '' };
  }

  /**
   * Step 2: Execute actual write to detected tag after user confirmation.
   */
  async executeWrite(userId: string, tagInfo: NFCTagInfo): Promise<WriteResult> {
    const url = this.generateTechPassUrl(userId);
    LogService.info(TAG, `Executing write for userId ${userId}...`, { url, tagId: tagInfo.id });

    try {
      await NFCService.writeTechPassUrl(url, tagInfo);
      return {
        success: true,
        url,
        tagId: tagInfo.id,
      };
    } catch (err: unknown) {
      LogService.error(TAG, 'Write execution failed', err);
      const message =
        err instanceof NFCError
          ? err.message
          : (err as Error)?.message || 'An unexpected error occurred while writing NFC tag.';
      return {
        success: false,
        url,
        tagId: tagInfo.id,
        error: message,
      };
    }
  }

  /** Cancel active NFC scan session */
  async cancel(): Promise<void> {
    await NFCService.cancelSession();
  }
}

export default NFCWriter.getInstance();
