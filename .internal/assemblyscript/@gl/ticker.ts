type TickCallback = (deltaMs: number) => void;

/**
 * An internal ticker that automatically ticks all internal systems that require
 * ticking, such as Characters, animations and state machines. This is not
 * intended for direct use by level authors.
 */
export class Ticker {
  private _subscribers: Set<TickCallback> = new Set();

  public subscribe(callback: TickCallback): void {
    this._subscribers.add(callback);
  }

  public unsubscribe(callback: TickCallback): void {
    this._subscribers.delete(callback);
  }

  public tick(deltaMs: number): void {
    for (const callback of this._subscribers) {
      callback(deltaMs);
    }
  }
}

export const globalTicker: Ticker = new Ticker();
