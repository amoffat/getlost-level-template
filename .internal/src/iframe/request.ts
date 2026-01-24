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

export interface SetAudioModeRequest {
  type: "set-audio-mode";
  data: {
    muted: boolean;
  };
}

export type DebugFlagKey =
  | "collisions"
  | "pathfinding"
  | "charSprites"
  | "zSorting";

export interface DebugFlag {
  type: "debug-flag";
  data: {
    flag: string;
    value: boolean;
  };
}

export interface SetGameSpeedRequest {
  type: "set-game-speed";
  data: {
    speed: number;
  };
}

export interface AdvanceGameTimeRequest {
  type: "advance-game-time";
  data: {
    amt: number | null;
  };
}

export interface GetTimeRequest {
  type: "get-time";
  data?: null;
  response: number;
}

export interface SetWindowGeomRequest {
  type: "set-window-geom";
  data: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type AnyRequest =
  | DebugFlag
  | AdvanceGameTimeRequest
  | GetTimeRequest
  | SetGameSpeedRequest
  | RecordMarkerMessage
  | ClearMarkerMessage
  | SavePathGraphRequest
  | SetWindowGeomRequest
  | SetAudioModeRequest;

export type RequestType = AnyRequest["type"];
export type ResponseFor<R extends AnyRequest> = R extends {
  response: infer Resp;
}
  ? Resp
  : null;

interface Envelope<Contents, Type> {
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
  envelope: RequestEnvelope<T> | ResponseEnvelope,
): envelope is ResponseEnvelope {
  return envelope.type === "response";
}
