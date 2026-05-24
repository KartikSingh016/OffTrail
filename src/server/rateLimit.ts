const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createRateLimiter(maxCalls: number, intervalMs: number) {
  const timestamps: number[] = [];
  let queue = Promise.resolve();

  async function acquire() {
    const now = Date.now();
    while (timestamps.length && now - timestamps[0] >= intervalMs) {
      timestamps.shift();
    }

    if (timestamps.length >= maxCalls) {
      const waitMs = intervalMs - (now - timestamps[0]) + 5;
      await delay(waitMs);
      return acquire();
    }

    timestamps.push(Date.now());
  }

  return async function schedule<T>(operation: () => Promise<T>): Promise<T> {
    const slot = queue.then(acquire, acquire);
    queue = slot.catch(() => undefined);
    await slot;
    return operation();
  };
}
