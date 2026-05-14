import type { Vector } from "./types/api/vector";

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
    charId: string;
    sensorId: string;
    direction: Vector;
    enter: boolean;
  };
}

export interface TalkEvent {
  type: "talk";
  data: {
    charId: string;
    otherId: string;
  };
}

export interface CharacterCollisionEvent {
  type: "collision";
  data: {
    charId: string;
    colliderId: string;
    direction: Vector;
    enter: boolean;
  };
}

export interface ChoiceMadeEvent {
  type: "choice-made";
  data: {
    choiceId: string;
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
    charId: string;
    tileId: string;
    enter: boolean;
  };
}

export interface StateChangeEvent {
  type: "state-change";
  data: {
    added: Set<string>;
    removed: Set<string>;
    ready: Set<string>;
    satisfied: Set<string>;
  };
}

export type AnyEvent =
  | PickupEvent
  | SensorEvent
  | CharacterCollisionEvent
  | TalkEvent
  | TimerCompletedEvent
  | TileCollisionEvent
  | StateChangeEvent
  | ChoiceMadeEvent;

interface Listener<T extends EventName> {
  filter: EventFilter<T>;
  callback: (event: EventData<T>) => void;
}

type EventName = AnyEvent["type"];
type EventType<T extends EventName> = Extract<AnyEvent, { type: T }>;
type EventData<T extends EventName> = EventType<T>["data"];
type EventFilter<T extends EventName> =
  | Partial<EventData<T>>
  | ((data: EventData<T>) => boolean)
  | null;

type EventHandlerFunction<T extends EventName> = (data: EventData<T>) => void;

export class EventDispatcher {
  private _listeners = new Map<string, Listener<any>[]>();

  public on<T extends EventName>({
    type,
    filter: filter = null,
    callback,
  }: {
    type: T;
    filter?: EventFilter<T>;
    callback: EventHandlerFunction<T>;
  }): () => void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    const listener: Listener<T> = {
      filter,
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

    for (const { filter, callback } of list) {
      if (eventMatches(filter, event.data)) {
        callback(event.data);
      }
    }
  }
}

function eventMatches<T extends EventName>(
  filter: EventFilter<T>,
  data: EventData<T>,
): boolean {
  if (filter === null) return true;
  if (typeof filter === "function") return filter(data);
  for (const k in filter) {
    if (data[k] !== filter[k]) return false;
  }
  return true;
}

export function dispatchEvent<T extends EventName>(event: EventType<T>): void {
  //   console.log("Received event", { event });
  if (events) {
    events.dispatch(event);
  }
}
