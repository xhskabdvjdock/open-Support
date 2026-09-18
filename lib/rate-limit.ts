/** Tiny in-memory fixed-window rate limiter for API routes. */

const buckets = new Map<string, number[]>();

function prune(now: number, stamps: number[], windowMs: number): number[] {
  const cutoff = now - windowMs;
  return stamps.filter((t) => t > cutoff);
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const stamps = prune(now, buckets.get(key) ?? [], windowMs);
  if (stamps.length >= limit) {
    const oldest = stamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, stamps);
    return { allowed: false, retryAfterSec };
  }
  stamps.push(now);
  buckets.set(key, stamps);
  return { allowed: true, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
