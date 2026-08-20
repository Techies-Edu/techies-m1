/**
 * Formatting utilities for display strings.
 */

/**
 * Returns a relative-time string from a Unix timestamp (ms).
 * e.g.  "just now" | "12s ago" | "3m ago"
 */
export function formatTimestamp(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 2000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

/**
 * Truncates a string and appends ellipsis if it exceeds maxLength.
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength - 3)}...`;
}
