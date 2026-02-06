import type { StoryDocV2 } from "../schema";

/**
 * Migration from version 2 to 3:
 * Moves the `label` property from StoryNodeData to `id`.
 * Removes the `label` property after migration.
 *
 * Previously, nodes had both an `id` and a separate `label` property in their data.
 * Now the `id` is used directly as the primary identifier and display label.
 */
export async function migrate(doc: StoryDocV2) {
  if (doc.nodes) {
    for (const node of doc.nodes) {
      if (node.data && (node.data as any).label) {
        // Move label to id
        node.data.id = (node.data as any).label;
        // Remove the label property
        delete (node.data as any).label;
      }
    }
  }
}
