import { storyOriginNodeId, storyOriginNodeName } from "@/constants";
import { BaseStoryDoc } from "../schema";

/**
 * v8 → v9: Ensures the story origin node (id = "default", data.id = "start")
 * is present in editor.nodes. This node is undeletable and serves as the
 * visual anchor for default-milestone dialogues of each speaker.
 */
export function migrate(doc: BaseStoryDoc): void {
  const v8 = doc as any;
  const nodes: any[] = v8.editor?.nodes ?? [];
  const alreadyPresent = nodes.some((n: any) => n.id === storyOriginNodeId);
  if (!alreadyPresent) {
    nodes.unshift({
      id: storyOriginNodeId,
      position: { x: 0, y: 0 },
      type: "story",
      data: { id: storyOriginNodeName, isOrigin: true },
    });
    v8.editor.nodes = nodes;
  }
}
