type PollFn = (tenantId: string) => Promise<void>;

export class PollScheduler {
  private timers = new Map<string, NodeJS.Timeout>();
  private pollFn: PollFn;
  private intervalMs: number;

  constructor(pollFn: PollFn, intervalSeconds = 30) {
    this.pollFn = pollFn;
    this.intervalMs = intervalSeconds * 1000;
  }

  start(tenantId: string): void {
    if (this.timers.has(tenantId)) return;

    // Run immediately on start, then on interval
    this.runSafe(tenantId);
    const timer = setInterval(() => this.runSafe(tenantId), this.intervalMs);
    this.timers.set(tenantId, timer);
  }

  stop(tenantId: string): void {
    const timer = this.timers.get(tenantId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(tenantId);
    }
  }

  stopAll(): void {
    for (const tenantId of this.timers.keys()) {
      this.stop(tenantId);
    }
  }

  forceImmediatePoll(tenantId: string): void {
    this.runSafe(tenantId);
  }

  updateInterval(intervalSeconds: number): void {
    this.intervalMs = intervalSeconds * 1000;
    // Restart all active timers with new interval
    const active = Array.from(this.timers.keys());
    this.stopAll();
    for (const tenantId of active) {
      this.start(tenantId);
    }
  }

  private runSafe(tenantId: string): void {
    this.pollFn(tenantId).catch(err => {
      console.error(`[PollScheduler] Error polling tenant ${tenantId}:`, err);
    });
  }
}
