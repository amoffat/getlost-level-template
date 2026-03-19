import type { Vector } from "./api/types/vector";

/**
 * Called when the player interacts with a pickup
 *
 * @param slug The slug of the pickup that was interacted with.
 * @param took Whether the player took the pickup or not.
 */
export interface PickupEvent {
  type: "pickup";
  data: {
    key: string;
    took: boolean;
  };
}

export interface SensorEvent {
  type: "sensor";
  data: {
    charName: string;
    sensorName: string;
    enter: boolean;
  };
}

export interface CharacterCollisionEvent {
  type: "collision";
  data: {
    character: string;
    collider: string;
    direction: Vector;
    enter: boolean;
  };
}

export interface ChoiceMadeEvent {
  type: "choice-made";
  data: {
    refId: string;
    choice: string;
  };
}

export interface TimerCompletedEvent {
  type: "timer-completed";
  data: {
    name: string;
  };
}

export interface TileCollisionEvent {
  type: "tile-collision";
  data: {
    charName: string;
    tileId: string;
    enter: boolean;
  };
}

export type AnyEvent =
  | PickupEvent
  | SensorEvent
  | CharacterCollisionEvent
  | TimerCompletedEvent
  | TileCollisionEvent
  | ChoiceMadeEvent;

interface Listener<T extends EventName> {
  key: Record<string, unknown> | null;
  callback: (event: EventData<T>) => void;
}

type EventName = AnyEvent["type"];
type EventType<T extends EventName> = Extract<AnyEvent, { type: T }>;
type EventData<T extends EventName> = EventType<T>["data"];
type FilterKey<T extends EventName> = Partial<EventData<T>> | null;

type EventHandlerFunction<T extends EventName> = (data: EventData<T>) => void;

export class EventDispatcher {
  private _listeners = new Map<string, Listener<any>[]>();

  public on<T extends EventName>(
    type: T,
    key: FilterKey<T>,
    callback: EventHandlerFunction<T>,
  ): () => void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    const listener: Listener<T> = {
      key: key as Record<string, unknown> | null,
      callback: callback as (event: EventData<T>) => void,
    };
    this._listeners.get(type)!.push(listener);

    return () => {
      const list = this._listeners.get(type);
      if (list) {
        const idx = list.indexOf(listener);
        if (idx !== -1) list.splice(idx, 1);
      }
    };
  }

  public dispatch(event: AnyEvent): void {
    const list = this._listeners.get(event.type);
    if (!list) return;

    for (const { key, callback } of list) {
      if (key === null || matchesKey(event.data, key)) {
        callback(event.data);
      }
    }
  }
}

function matchesKey(
  data: Record<string, unknown>,
  key: Record<string, unknown>,
): boolean {
  for (const k in key) {
    if (data[k] !== key[k]) return false;
  }
  return true;
}

export function dispatchEvent<T extends EventName>(event: EventType<T>): void {
  //   console.log("Received event", { event });
  if (events) {
    events.dispatch(event);
  }
}
