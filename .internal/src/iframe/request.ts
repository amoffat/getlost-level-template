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

export interface SavePathGraphRequest {
  type: "save-path-graph";
  data: {
    graph: Uint8Array<ArrayBuffer>;
  };
}

export type AnyRequest =
  | RecordMarkerMessage
  | ClearMarkerMessage
  | SavePathGraphRequest;

export type RequestType = AnyRequest["type"];
export type ResponseFor<R extends AnyRequest> = R extends {
  response: infer Resp;
}
  ? Resp
  : null;

export interface Envelope<Contents, Type> {
  // Unique identifier for the request or response
  id: string;
  // The level which sent the request or response. This is used for filtering
  // out messages that are not relevant to the current level.
  forLevel: string | undefined;
  type: Type;
  contents: Contents;
}

export type RequestEnvelope<Contents extends Omit<AnyRequest, "response">> =
  Envelope<Contents["data"], Contents["type"]>;

export interface ResponseEnvelope extends Envelope<unknown, "response"> {
  id: string;
  forId: string;
}

export function isResponse<T extends AnyRequest>(
  envelope: RequestEnvelope<T> | ResponseEnvelope
): envelope is ResponseEnvelope {
  return envelope.type === "response";
}
