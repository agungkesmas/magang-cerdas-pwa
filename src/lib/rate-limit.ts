// ============================================================
// RATE LIMITER — IP-based brute-force protection for login APIs
// ============================================================
// Strategy: in-memory Map (works per-serverless-instance).
// For production-grade distributed rate limiting, upgrade to
// Upstash Redis (@upstash/ratelimit + @upstash/redis).
//
// Policy:
//   - 5 failed attempts per IP per 15-minute window
//   - On 6th attempt: lock for 30 minutes (return 429)
//   - Successful login clears the counter for that IP
//   - Entries auto-expire after lock window passes
// ============================================================

interface RateEntry {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number | null;
}

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;       // 15 min sliding window
const LOCK_MS = 30 * 60 * 1000;         // 30 min lockout

// Map<key, RateEntry> — key = `${routeId}:${ip}`
const store = new Map<string, RateEntry>();

// Periodic cleanup (every 5 min) to prevent memory leak
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [k, v] of store.entries()) {
    if (v.lockedUntil && v.lockedUntil < now && (now - (v.lockedUntil || 0)) > WINDOW_MS) {
      store.delete(k);
    } else if (!v.lockedUntil && (now - v.firstFailureAt) > WINDOW_MS) {
      store.delete(k);
    }
  }
}

export interface RateCheckResult {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil?: number; // epoch ms
  retryAfterSeconds?: number;
}

/**
 * Check if a request from `ip` to `routeId` is allowed.
 * Returns { allowed: false } if currently locked.
 */
export function checkRateLimit(routeId: string, ip: string): RateCheckResult {
  cleanup();
  const key = `${routeId}:${ip}`;
  const entry = store.get(key);

  if (entry?.lockedUntil && entry.lockedUntil > Date.now()) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: entry.lockedUntil,
      retryAfterSeconds
    };
  }

  // Lock expired → reset
  if (entry?.lockedUntil && entry.lockedUntil <= Date.now()) {
    store.delete(key);
  }

  const failures = entry?.failures || 0;
  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_FAILURES - failures)
  };
}

/**
 * Record a failed attempt. Locks the IP after MAX_FAILURES.
 */
export function recordFailure(routeId: string, ip: string): void {
  cleanup();
  const key = `${routeId}:${ip}`;
  const now = Date.now();
  const existing = store.get(key);

  // If window expired, reset
  if (existing && (now - existing.firstFailureAt) > WINDOW_MS && !existing.lockedUntil) {
    store.delete(key);
  }

  const entry = store.get(key) || { failures: 0, firstFailureAt: now, lockedUntil: null };
  entry.failures += 1;

  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = now + LOCK_MS;
  }

  store.set(key, entry);
}

/**
 * Clear rate-limit counter on successful login (reset backoff).
 */
export function clearRateLimit(routeId: string, ip: string): void {
  store.delete(`${routeId}:${ip}`);
}

/**
 * Extract client IP from NextRequest headers.
 * Handles Vercel's x-forwarded-for and other common proxies.
 */
export function getClientIP(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    // First IP in the chain is the original client
    return xff.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}
