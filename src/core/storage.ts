/** localStorage/sessionStorage wrappers that never throw (private mode, blocked storage). */

const PREFIX = 'kompas95.';

function area(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function load(key: string, kind: 'local' | 'session' = 'local'): string | null {
  try {
    return area(kind)?.getItem(PREFIX + key) ?? null;
  } catch {
    return null;
  }
}

export function save(key: string, value: string, kind: 'local' | 'session' = 'local'): void {
  try {
    area(kind)?.setItem(PREFIX + key, value);
  } catch {
    /* storage unavailable – settings simply won't persist */
  }
}

export function remove(key: string, kind: 'local' | 'session' = 'local'): void {
  try {
    area(kind)?.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
