import pino from "pino";
import { v4 as uuidv4 } from "uuid";
import {
  isResponse,
  type RequestEnvelope,
  type ResponseEnvelope,
  type ShellRequest,
} from "./iframe/request";
import { log } from "./log";

type EventHandler<T extends ShellRequest = ShellRequest> = (
  envelope: RequestEnvelope<T>
) => void;

type PromiseOrNull<T> = T extends null ? null : Promise<T>;

// This class is used to communicate between the parent window and the child
export class Comms {
  private _window: Window;
  private _otherWindow: Window;
  private _resolvers: Map<string, (data: any) => void> = new Map();
  private _handlers: Map<string, Map<string, EventHandler<any>>> = new Map();
  log: pino.Logger;

  constructor(window: Window, otherWindow: Window) {
    this._window = window;
    this._otherWindow = otherWindow;
    this.log = log.child({
      name: "comms",
      role: window.parent === window ? "parent" : "child",
    });

    this._window.addEventListener(
      "message",
      // We don't need to check the message origin because we're using a CSP
      (event: MessageEvent<RequestEnvelope<any>>) => {
        const envelope = event.data;

        if (isResponse(envelope)) {
          // this.log.info(
          //   { id: envelope.id, forId: envelope.forId },
          //   "Received response"
          // );
          const { forId, contents: data } = envelope;
          const resolver = this._resolvers.get(forId);
          if (resolver) {
            resolver(data);
            this._resolvers.delete(forId);
          }
        } else {
          // this.log.info(
          //   {
          //     id: envelope.id,
          //     type: envelope.type,
          //   },
          //   "Received request"
          // );

          // Dispatch
          const handlers = this._handlers.get(envelope.type);
          if (handlers) {
            handlers.forEach((h) => h(envelope));
          }
        }
      }
    );
  }

  addMessageListener<T extends ShellRequest = ShellRequest>(
    messageType: T["type"],
    callback: EventHandler<T>
  ): () => void {
    const id = uuidv4();

    let handlers = this._handlers.get(messageType);
    if (handlers) {
      handlers.set(id, callback);
    } else {
      handlers = new Map([[id, callback]]);
      this._handlers.set(messageType, handlers);
    }

    return () => {
      handlers.delete(id);
    };
  }

  // Make a request to the other window, optionally returning a promise for a
  // response.
  request<T = null, R extends ShellRequest = ShellRequest>(
    req: R,
    hasResponse: boolean = false
  ): PromiseOrNull<T> {
    // this.log.info(`Requesting: ${req.type}`);
    const id = uuidv4();
    const msg: RequestEnvelope<R> = {
      id,
      type: req.type,
      contents: { ...req },
    };
    if (hasResponse) {
      const p = this._waitForResponse<T>(id);
      // We don't need to set the target origin because we're using a CSP
      this._otherWindow.postMessage(msg, "*");
      return p as PromiseOrNull<T>;
    } else {
      // We don't need to set the target origin because we're using a CSP
      this._otherWindow.postMessage(msg, "*");
      return null as PromiseOrNull<T>;
    }
  }

  // Respond to a request from the other
  respond<T>(forId: string, data: T) {
    const id = uuidv4();
    const msg: ResponseEnvelope = {
      id,
      forId,
      type: "response",
      contents: data,
    };
    // We don't need to set the target origin because we're using a CSP
    this._otherWindow.postMessage(msg, "*");
  }

  // Set up a promise of a response for a request that was made
  private _waitForResponse<T>(id: string): Promise<T> {
    return new Promise<T>((resolve) => {
      this._resolvers.set(id, resolve);
    });
  }
}
