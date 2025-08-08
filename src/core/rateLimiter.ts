export class RateLimiter {
  private tokens: number;
  private last: number;
  constructor(private capacity: number, private refillMs: number) {
    this.tokens = capacity;
    this.last = Date.now();
  }

  allow(): boolean {
    const now = Date.now();
    const delta = now - this.last;
    this.tokens = Math.min(this.capacity, this.tokens + (delta / this.refillMs) * this.capacity);
    this.last = now;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}
