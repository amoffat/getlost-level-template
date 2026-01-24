import pino from "pino";
import { v4 as uuidv4 } from "uuid";
import {
  isResponse,
  type AnyRequest,
  type RequestEnvelope,
  type ResponseEnvelope,
  type ResponseFor,
} from "./iframe/request";
import { log } from "./log";
import { isAsync } from "./utils/async";

type EventHandlerFunction<Req extends AnyRequest = AnyRequest> = (
  data: Req extends { data: infer D } ? D : never,
  respond: (data: ResponseFor<Req>) => void,
  envelope: Pick<RequestEnvelope<Req>, "id" | "forLevel">,
) => any;

interface EventHandler<T extends AnyRequest = AnyRequest> {
  callback: EventHandlerFunction<T>;
  once: boolean;
}

// This class is used to communicate between the parent window and the child
export class Comms {
  private _window: Window;
  private _subWindows: Window[];
  private _resolvers: Map<string, (data: any) => void> = new Map();
  private _handlers: Map<string, Map<string, EventHandler<any>>> = new Map();
  private _teardowns: Array<VoidFunction> = [];
  public level: string | undefined;
  log: pino.Logger;

  // Microtask batching for fire-and-forget requests
  private _sendQueue: Array<RequestEnvelope<any> | ResponseEnvelope> = [];
  private _flushScheduled = false;

  constructor({
    window,
    subWindows,
    role,
    levelId,
  }: {
    window: Window;
    subWindows: Window[];
    role: "parent" | "child";
    levelId?: string;
  }) {
    this._window = window;
    this._subWindows = subWindows;
    this.level = levelId;
    this.log = log.child({
      name: "comms",
      role,
      levelId: levelId ?? "unknown",
    });
    this.log.info("Comms initialized");

    const msgHandler = (event: MessageEvent<any>) => {
      // We don't need to check the message origin because we're using a CSP
      const payload = event.data;
      const messages: Array<RequestEnvelope<any> | ResponseEnvelope> =
        Array.isArray(payload) ? payload : [payload];

      for (const envelope of messages) {
        if (isResponse(envelope)) {
          const { forId, contents: data } = envelope;
          const resolver = this._resolvers.get(forId);
          if (resolver) {
            resolver(data);
            this._resolvers.delete(forId);
          }
          continue;
        }

        const respond = (data: ResponseFor<any>) => {
          this.respond(envelope.id, data);
        };
        const handlers = this._handlers.get(envelope.type);
        const smallEnvelope = {
          id: envelope.id,
          forLevel: envelope.forLevel,
        };
        if (handlers) {
          for (const [id, h] of handlers) {
            h.callback.call(this, envelope.contents, respond, smallEnvelope);
            if (h.once) {
              handlers.delete(id);
            }
          }
        }
      }
    };

    this._window.addEventListener("message", msgHandler);
    this._teardowns.push(() => {
      this._window.removeEventListener("message", msgHandler);
    });
  }

  public destroy(): void {
    for (const teardown of this._teardowns) {
      teardown();
    }
  }

  private _broadcastBatch(
    msgs: Array<RequestEnvelope<any> | ResponseEnvelope>,
  ): void {
    for (const sub of this._subWindows) {
      sub.postMessage(msgs, "*");
    }
  }

  private _scheduleFlush(): void {
    if (this._flushScheduled) return;
    this._flushScheduled = true;
    queueMicrotask(() => {
      try {
        this._flushQueue();
      } finally {
        this._flushScheduled = false;
      }
    });
  }

  private _flushQueue(): void {
    if (this._sendQueue.length === 0) return;
    const batch = this._sendQueue;
    this._sendQueue = [];
    this._broadcastBatch(batch);
  }

  addMessageListener<T extends AnyRequest = AnyRequest>({
    type,
    callback,
    once = false,
  }: {
    type: T["type"];
    callback: EventHandlerFunction<T>;
    once?: boolean;
  }): () => void {
    const id = uuidv4();

    // Add some error handling to the callback, so errors don't get swallowed.
    let wrapped: EventHandlerFunction<T>;
    if (isAsync(callback)) {
      wrapped = async (data, respond, envelope) => {
        callback(data, respond, envelope).catch((err: any) => {
          this.log.error({ err }, "Async event handler threw");
        });
      };
    } else {
      wrapped = (data, respond, envelope) => {
        try {
          callback(data, respond, envelope);
        } catch (err) {
          this.log.error({ err }, "Sync event handler threw");
        }
      };
    }

    let handlers = this._handlers.get(type);
    if (handlers) {
      handlers.set(id, { callback: wrapped, once });
    } else {
      handlers = new Map([[id, { callback: wrapped, once }]]);
      this._handlers.set(type, handlers);
    }

    return () => {
      if (handlers) {
        handlers.delete(id);
      }
    };
  }

  // Make a request to the other window, optionally returning a promise for a
  // response.
  request<Req extends AnyRequest, Resp = Promise<ResponseFor<Req>>>(
    req: Omit<Req, "response">,
    hasResponse: boolean = false,
  ): Resp {
    // this.log.info(`Requesting: ${req.type}`);
    const id = uuidv4();
    const msg: RequestEnvelope<Req> = {
      id,
      forLevel: this.level,
      type: req.type,
      contents: req.data,
    };
    if (hasResponse) {
      const p = this._waitForResponse<Resp>(id);
      // Send immediately as a singleton batch to align with array-based protocol
      this._broadcastBatch([msg]);
      return p as Resp;
    } else {
      // Batch fire-and-forget requests in a microtask
      this._sendQueue.push(msg);
      this._scheduleFlush();
      return null as Resp;
    }
  }

  // Respond to a request from the other
  private respond<T>(forId: string, data: T) {
    const id = uuidv4();
    const msg: ResponseEnvelope = {
      id,
      forLevel: this.level,
      forId,
      type: "response",
      contents: data,
    };
    // We don't need to set the target origin because we're using a CSP
    // Send as a singleton batch to match array-based protocol
    this._broadcastBatch([msg]);
  }

  // Set up a promise of a response for a request that was made
  private _waitForResponse<T>(id: string): Promise<T> {
    return new Promise<T>((resolve) => {
      this._resolvers.set(id, resolve);
    });
  }
}
