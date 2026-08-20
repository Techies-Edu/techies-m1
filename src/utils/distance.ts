/**
 * RSSI-to-distance estimation using the log-distance path loss model.
 *
 * Formula:  distance = 10 ^ ((txPower − rssi) / (10 × n))
 *   txPower : measured RSSI at 1 metre (calibrated constant ≈ −59 dBm)
 *   n       : path-loss exponent (2.0 free-space, 2.5–3.5 indoor)
 *
 * Note: BLE RSSI is noisy; treat estimates as rough guidance only.
 */

const TX_POWER = -59; // dBm at 1 m (typical BLE peripheral)
const PATH_LOSS_EXPONENT = 2.5; // Indoor environment

/**
 * Converts an RSSI value to an estimated distance in metres.
 * Returns -1 when the input is null/undefined/zero.
 */
export function calculateDistance(rssi: number | null | undefined): number {
  if (rssi === null || rssi === undefined || rssi === 0) {
    return -1;
  }
  const exponent = (TX_POWER - rssi) / (10 * PATH_LOSS_EXPONENT);
  return Math.pow(10, exponent);
}

/**
 * Formats an estimated distance for display.
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 0) {
    return 'Unknown';
  }
  if (distanceMeters < 1) {
    return `${Math.round(distanceMeters * 100)} cm`;
  }
  if (distanceMeters < 100) {
    return `${distanceMeters.toFixed(1)} m`;
  }
  return '> 100 m';
}

/**
 * Returns a human-readable signal quality label.
 */
export function getSignalStrengthLabel(rssi: number): string {
  if (rssi >= -50) return 'Excellent';
  if (rssi >= -65) return 'Good';
  if (rssi >= -75) return 'Fair';
  return 'Weak';
}

/**
 * Maps RSSI to a 0–4 bar count for signal strength visualisation.
 */
export function getSignalBars(rssi: number): number {
  if (rssi >= -50) return 4;
  if (rssi >= -65) return 3;
  if (rssi >= -75) return 2;
  if (rssi >= -85) return 1;
  return 0;
}

/**
 * Returns true if the device is within close proximity (< 12 cm).
 * Strong RSSI (>= -43 dBm) or calculated distance <= 0.12m.
 */
export function isCloseProximity(rssi: number): boolean {
  if (rssi >= -43) return true;
  const dist = calculateDistance(rssi);
  return dist > 0 && dist <= 0.12;
}
