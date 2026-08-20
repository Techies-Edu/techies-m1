/**
 * Production logging service.
 *
 * Outputs prefixed, level-tagged messages to:
 *   - Metro developer console (debug builds)
 *   - Android Logcat via console.*  (tagged: [MeshConnect])
 *
 * All log levels are retained in an in-memory ring buffer (max 500 entries)
 * for potential in-app log viewer features in future versions.
 */
import { LogLevel, LogEntry } from '../types/LogTypes';

const APP_TAG = '[MeshConnect]';
const MAX_ENTRIES = 500;

class LogService {
  private entries: LogEntry[] = [];

  private write(level: LogLevel, tag: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      tag,
      message,
      timestamp: Date.now(),
      data,
    };

    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift();
    }

    const prefix = `${APP_TAG} [${level}] [${tag}]`;
    const formatted =
      data !== undefined ? `${prefix} ${message} ${JSON.stringify(data)}` : `${prefix} ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  debug(tag: string, message: string, data?: unknown): void {
    this.write(LogLevel.DEBUG, tag, message, data);
  }

  info(tag: string, message: string, data?: unknown): void {
    this.write(LogLevel.INFO, tag, message, data);
  }

  warn(tag: string, message: string, data?: unknown): void {
    this.write(LogLevel.WARN, tag, message, data);
  }

  error(tag: string, message: string, data?: unknown): void {
    this.write(LogLevel.ERROR, tag, message, data);
  }

  /** Returns a snapshot of all retained log entries (newest last). */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clearEntries(): void {
    this.entries = [];
  }
}

export default new LogService();
