/**
 * App-wide logger for debugging.
 * Logs navigation events, API calls, user actions, and errors.
 * Output goes to Metro console (visible in terminal).
 *
 * In production builds, logging is disabled.
 */

const IS_DEV = __DEV__;

type LogLevel = 'NAV' | 'API' | 'TAP' | 'AUTH' | 'SYNC' | 'ERR' | 'STORE' | 'RENDER';

const COLORS: Record<LogLevel, string> = {
  NAV: '🧭',
  API: '📡',
  TAP: '👆',
  AUTH: '🔐',
  SYNC: '🔄',
  ERR: '❌',
  STORE: '📦',
  RENDER: '🖼️',
};

function timestamp(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
}

export function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  if (!IS_DEV) return;

  const icon = COLORS[level];
  const ts = timestamp();
  const dataStr = data ? ' ' + JSON.stringify(data) : '';

  console.log(`${icon} [${ts}] [${level}] ${message}${dataStr}`);
}

// Convenience shortcuts
export const navLog = (msg: string, data?: Record<string, unknown>) => log('NAV', msg, data);
export const apiLog = (msg: string, data?: Record<string, unknown>) => log('API', msg, data);
export const tapLog = (msg: string, data?: Record<string, unknown>) => log('TAP', msg, data);
export const authLog = (msg: string, data?: Record<string, unknown>) => log('AUTH', msg, data);
export const syncLog = (msg: string, data?: Record<string, unknown>) => log('SYNC', msg, data);
export const errLog = (msg: string, data?: Record<string, unknown>) => log('ERR', msg, data);
export const storeLog = (msg: string, data?: Record<string, unknown>) => log('STORE', msg, data);
