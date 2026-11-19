// DevMeDoAnDrOiD

const pendingWrites = new Map<string, { data: unknown; timer: ReturnType<typeof setTimeout> }>();

export function readCache<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const NON_ESSENTIAL_KEYS = [
  'shaha_requests_cache',
  'shaha_reports_cache',
  'shaha_messages_cache',
  'shaha_claims_cache',
  'shaha_suggestions_cache',
  'shaha_error_log_v1'
];

export function scheduleCacheWrite(key: string, data: unknown, delayMs = 350): void {
  if (typeof window === 'undefined') return;
  const existing = pendingWrites.get(key);
  if (existing) clearTimeout(existing.timer);

  const bounded =
    Array.isArray(data) && NON_ESSENTIAL_KEYS.includes(key) && data.length > 60
      ? data.slice(0, 60)
      : data;

  const timer = setTimeout(() => {
    pendingWrites.delete(key);
    const flush = () => {
      const serialized = JSON.stringify(bounded);
      if (serialized.length > 512 * 1024 && NON_ESSENTIAL_KEYS.includes(key)) {
        return;
      }
      try {
        localStorage.setItem(key, serialized);
      } catch {
        for (const staleKey of NON_ESSENTIAL_KEYS) {
          if (staleKey !== key) {
            try {
              localStorage.removeItem(staleKey);
            } catch {}
          }
        }
        try {
          localStorage.setItem(key, serialized);
        } catch {
          // Ignore if quota still exceeded
        }
      }
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(flush, { timeout: 1000 });
    } else {
      flush();
    }
  }, delayMs);

  pendingWrites.set(key, { data: bounded, timer });
}

export function removeCache(key: string): void {
  if (typeof window === 'undefined') return;
  const existing = pendingWrites.get(key);
  if (existing) {
    clearTimeout(existing.timer);
    pendingWrites.delete(key);
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

// Copyright (c) 2026 MeDoAnDrOiD. All Rights Reserved.
