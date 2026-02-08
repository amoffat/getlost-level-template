import type { StoryDocV3 } from "../schema";

export async function migrate(doc: StoryDocV3) {
  if (doc.nodes) {
    for (const node of doc.nodes) {
      node.type = "story";
    }
  }
}
