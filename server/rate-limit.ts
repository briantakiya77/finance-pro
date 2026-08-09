type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function assertRateLimit(key: string, limitPerMinute: number) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + 60_000
    });
    return;
  }

  if (existing.count >= limitPerMinute) {
    throw new Error('rate limit exceeded');
  }

  existing.count += 1;
}
