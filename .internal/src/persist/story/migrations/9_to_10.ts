import { playerParticipantId } from "@/constants";
import { BaseStoryDoc } from "../schema";

/**
 * v9 → v10: Multi-participant dialogues.
 *
 * Every speech node gains explicit `speakerId`/`listenerId`. Previously each
 * dialogue was implicitly "subject speaks to player", so we backfill:
 * `speakerId = dialogue.subjectId` and `listenerId = "player"`. This preserves
 * the existing behavior (the NPC speaks; the player listens and chooses).
 */
export function migrate(doc: BaseStoryDoc): void {
  const v9 = doc as any;
  const dialogues: any[] = v9.editor?.dialogues ?? [];
  for (const dlg of dialogues) {
    const entities = dlg?.nodes?.entities ?? {};
    for (const node of Object.values<any>(entities)) {
      if (!node?.data) continue;
      if (node.data.speakerId === undefined) {
        node.data.speakerId = dlg.subjectId ?? null;
      }
      if (node.data.listenerId === undefined) {
        node.data.listenerId = playerParticipantId;
      }
    }
  }
}
