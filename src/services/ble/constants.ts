/**
 * Shared constants for BLE services.
 */

/** MeshConnect service UUID — used for both advertising and scan filtering */
export const MESH_SERVICE_UUID = '10000000-0000-1000-8000-00805F9B34FB';

/** Time after which a device that stops advertising is removed from the list */
export const DEVICE_TIMEOUT_MS = 4_000;

/** How often the cleanup timer runs to evict stale devices */
export const CLEANUP_INTERVAL_MS = 1_000;

/** Maximum time allowed for a BLE connection to be established */
export const CONNECTION_TIMEOUT_MS = 10_000;

/** Android ScanMode.LOW_LATENCY — fastest scan results at higher battery cost */
export const SCAN_MODE_LOW_LATENCY = 2;

/** Bluetooth SIG company identifier for manufacturer data (0xFFFF = unregistered/test) */
export const COMPANY_ID = 0xffff;
