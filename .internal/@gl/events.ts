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
    state: string;
    satisfied: boolean;
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
  callback: (event: EventData<T>) => undefined | boolean;
}

type EventName = AnyEvent["type"];
type EventType<T extends EventName> = Extract<AnyEvent, { type: T }>;
type EventData<T extends EventName> = EventType<T>["data"];
type EventFilter<T extends EventName> =
  | Partial<EventData<T>>
  | ((data: EventData<T>) => boolean)
  | null;

type EventHandlerFunction<T extends EventName> = (
  data: EventData<T>,
) => undefined | boolean;

export class EventDispatcher {
  private _listeners = new Map<string, Map<Listener<any>, Listener<any>>>();

  public on<T extends EventName>({
    type,
    filter = null,
    ...rest
  }: {
    type: T;
    filter?: EventFilter<T>;
  } & (
    | { callback: EventHandlerFunction<T>; callbacks?: never }
    | { callbacks: EventHandlerFunction<T>[]; callback?: never }
  )): () => void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Map());
    }
    const lmap = this._listeners.get(type)!;

    const cbs: EventHandlerFunction<T>[] =
      "callbacks" in rest && rest.callbacks != null
        ? rest.callbacks
        : [rest.callback!];

    const listeners = cbs.map((cb) => {
      const listener: Listener<T> = {
        filter,
        callback: cb,
      };
      lmap.set(listener, listener);
      return listener;
    });

    return () => {
      for (const listener of listeners) {
        lmap.delete(listener);
      }
    };
  }

  public dispatch(event: AnyEvent): void {
    const lmap = this._listeners.get(event.type);
    if (!lmap) return;

    for (const listener of lmap.values()) {
      if (eventMatches(listener.filter, event.data)) {
        const isDone = listener.callback(event.data);
        if (isDone) {
          lmap.delete(listener);
        }
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
