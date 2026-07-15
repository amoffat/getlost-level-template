export type Listener<T> = (payload: T) => void;

export class LevelEmitter<Events extends Record<string, any>> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>) {
    (this.listeners[event] ??= new Set()).add(fn);
    return () => this.off(event, fn); // return unsubscribe fn
  }

  off<K extends keyof Events>(event: K, fn: Listener<Events[K]>) {
    this.listeners[event]?.delete(fn);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]) {
    this.listeners[event]?.forEach((fn) => fn(payload));
  }
}
