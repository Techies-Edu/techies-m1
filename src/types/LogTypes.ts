/**
 * Logging infrastructure types.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  timestamp: number;
  data?: unknown;
}
