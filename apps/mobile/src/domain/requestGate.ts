/**
 * Latest-request-wins guard. Responses can arrive in a different order than the taps that
 * caused them; only the newest request may update the UI.
 */
export function createRequestGate() {
  let seq = 0;
  return {
    begin(): number {
      seq += 1;
      return seq;
    },
    isCurrent(ticket: number): boolean {
      return ticket === seq;
    },
    /** Runs a task and resolves with { current } so callers can drop stale results. */
    async run<T>(task: () => Promise<T>): Promise<{ current: boolean; value?: T; error?: unknown }> {
      const ticket = this.begin();
      try {
        const value = await task();
        return { current: ticket === seq, value };
      } catch (error) {
        return { current: ticket === seq, error };
      }
    },
  };
}

export type RequestGate = ReturnType<typeof createRequestGate>;
