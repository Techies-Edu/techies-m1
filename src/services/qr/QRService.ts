/**
 * QRService — Techies QR Code Payload Generator & Parser.
 *
 * Payload format: https://techies.app/p/<deviceId>
 *
 * Rules:
 * - Only the deviceId is encoded — NEVER private profile fields.
 * - Payload is generated locally, no network required.
 * - Parse validates the scheme + host before extracting deviceId.
 */

const TECHIES_BASE_URL = 'https://techies.app/p/';
const TECHIES_HOST = 'techies.app';
const TECHIES_PATH_PREFIX = '/p/';

export interface QRParseResult {
  isValid: boolean;
  deviceId: string | null;
  error?: string;
}

class QRService {
  private static instance: QRService;

  static getInstance(): QRService {
    if (!QRService.instance) {
      QRService.instance = new QRService();
    }
    return QRService.instance;
  }

  /**
   * Build the canonical QR payload URL for a given device ID.
   * e.g. "https://techies.app/p/550e8400-e29b-41d4-a716-446655440000"
   */
  generateQRPayload(deviceId: string): string {
    return `${TECHIES_BASE_URL}${deviceId}`;
  }

  /**
   * Parse and validate a raw QR code string scanned by the camera.
   *
   * Accepts:
   *   - https://techies.app/p/<deviceId>
   *   - techies://p/<deviceId>  (deep-link variant)
   *
   * Returns { isValid: true, deviceId } on success.
   * Returns { isValid: false, deviceId: null, error } on failure.
   */
  parseQRPayload(raw: string): QRParseResult {
    if (!raw || raw.trim().length === 0) {
      return { isValid: false, deviceId: null, error: 'Empty QR payload' };
    }

    const trimmed = raw.trim();

    // Attempt to parse as URL
    try {
      const url = new URL(trimmed);

      const isHttpsTechies =
        url.protocol === 'https:' &&
        url.hostname === TECHIES_HOST &&
        url.pathname.startsWith(TECHIES_PATH_PREFIX);

      const isTechiesScheme = url.protocol === 'techies:' && url.pathname.startsWith('/p/');

      if (!isHttpsTechies && !isTechiesScheme) {
        return {
          isValid: false,
          deviceId: null,
          error: 'Not a Techies QR code',
        };
      }

      const pathPrefix = isHttpsTechies ? TECHIES_PATH_PREFIX : '/p/';
      const deviceId = url.pathname.slice(pathPrefix.length).trim();

      if (!deviceId || deviceId.length === 0) {
        return {
          isValid: false,
          deviceId: null,
          error: 'Missing device ID in QR',
        };
      }

      return { isValid: true, deviceId };
    } catch {
      return {
        isValid: false,
        deviceId: null,
        error: 'Not a Techies QR code',
      };
    }
  }
}

export default QRService.getInstance();
