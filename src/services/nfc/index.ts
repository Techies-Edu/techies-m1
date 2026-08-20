/**
 * Services / NFC — Export barrel for NFC TechPass infrastructure.
 */
export { default as NFCService, NFCError } from './NFCService';
export type { NFCTagInfo, NFCErrorType } from './NFCService';

export { default as NFCWriter, BASE_TECHPASS_URL } from './NFCWriter';
export type { WriteResult } from './NFCWriter';

export { default as NFCDeepLinkHandler } from './NFCDeepLinkHandler';
export type { DeepLinkParseResult } from './NFCDeepLinkHandler';
