/**
 * Handles rate limiting for API requests
 */
export class RateLimiter {
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private readonly maxRequestsPerInterval: number;
  private readonly intervalMs: number;

  constructor(maxRequestsPerInterval: number = 3, intervalMs: number = 1000) {
    this.maxRequestsPerInterval = maxRequestsPerInterval;
    this.intervalMs = intervalMs;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const timeElapsed = now - this.lastRequestTime;

    // Reset counter if interval has passed
    if (timeElapsed >= this.intervalMs) {
      this.requestCount = 0;
      this.lastRequestTime = now;
      return;
    }

    // If we've hit the limit, wait for the remainder of the interval
    if (this.requestCount >= this.maxRequestsPerInterval) {
      const delayMs = this.intervalMs - timeElapsed;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      this.requestCount = 0;
      this.lastRequestTime = Date.now();
    }

    this.requestCount++;
  }
}
