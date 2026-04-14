const MAX_MESSAGES_PER_HOUR = 30;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limiter = new Map<string, RateLimitEntry>();

export function checkRateLimit(userId: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();

  // Prune expired entries to prevent memory leak
  if (limiter.size > 50) {
    for (const [key, e] of limiter) {
      if (now >= e.resetAt) limiter.delete(key);
    }
  }

  const entry = limiter.get(userId);

  if (!entry || now >= entry.resetAt) {
    limiter.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_MESSAGES_PER_HOUR) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true };
}
