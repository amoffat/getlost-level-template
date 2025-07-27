export type RequestType = ShellRequest["type"];

export interface IFrameResponse {
  id: string;
  data?: unknown;
}

export interface RecordMarkerMessage {
  type: "record-marker";
  data: {
    slug: string;
  };
}

export interface ClearMarkerMessage {
  type: "clear-marker";
  data: {
    slug: string | null;
  };
}

export type ShellRequest = RecordMarkerMessage | ClearMarkerMessage;

export interface Envelope<T> {
  id: string;
  type: RequestType | "response";
  contents: T;
}

export type RequestEnvelope<T extends ShellRequest = ShellRequest> =
  Envelope<T>;

export interface ResponseEnvelope extends Envelope<unknown> {
  id: string;
  forId: string;
  type: "response";
  contents: unknown;
}

export function isResponse<T extends ShellRequest>(
  envelope: RequestEnvelope<T> | ResponseEnvelope
): envelope is ResponseEnvelope {
  return envelope.type === "response";
}
