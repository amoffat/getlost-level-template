import { playerParticipantId } from "@/constants";
import { entranceIcon } from "@/constants/tsObjs";
import { globals as g } from "@/globals";
import { shallowEqual, useAppSelector } from "@/hooks/redux";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import {
  isNpcInstance,
  isTileGroupInstance,
  SpeakableMapObj,
} from "@/types/map";
import type { NpcTemplate } from "@/types/npc";
import type { TileGroupTemplate } from "@/types/tilegroup";
import { Image as MantineImage } from "@mantine/core";
import TilesetGroup from "../TilesetGroup";

type ResolvedAvatar =
  | { kind: "none" }
  | { kind: "image"; url: string }
  | { kind: "group"; group: TileGroupTemplate };

/**
 * Renders the avatar for a dialogue participant — a SpeakableMapObj id or the
 * player sentinel. Prefers a speaker-image override, otherwise the object's
 * sprite (NPC WalkDown frame / tile group). The player uses a fixed icon.
 */
export function ParticipantAvatar({
  participantId,
  scale = 2,
  size = 38,
}: {
  participantId: string | null;
  scale?: number;
  size?: number;
}) {
  const resolved = useAppSelector((state): ResolvedAvatar => {
    if (!participantId) return { kind: "none" };

    if (participantId === playerParticipantId) {
      const template = tsSelectors.templateFromId(
        state,
        entranceIcon,
      ) as TileGroupTemplate | null;
      return template ? { kind: "group", group: template } : { kind: "none" };
    }

    const obj = mapSelectors.selectObject(state, participantId) as
      | SpeakableMapObj
      | undefined;
    if (!obj) return { kind: "none" };

    if (obj.speakerImageId) {
      const url = g.speakerImageObjectUrlCache.get(obj.speakerImageId);
      if (url) return { kind: "image", url };
    }

    if (isNpcInstance(obj)) {
      const tmpl = tsSelectors.templateFromId(
        state,
        obj.tsObjId,
      ) as NpcTemplate | null;
      const tg = tmpl?.animations["WalkDown"]?.animation.frames[0]?.tg ?? null;
      return tg ? { kind: "group", group: tg } : { kind: "none" };
    }

    if (isTileGroupInstance(obj)) {
      const tmpl = tsSelectors.templateFromId(
        state,
        obj.tsObjId,
      ) as TileGroupTemplate | null;
      return tmpl ? { kind: "group", group: tmpl } : { kind: "none" };
    }

    return { kind: "none" };
  }, shallowEqual);

  if (resolved.kind === "none") return null;

  // Always occupy a consistent size×size footprint regardless of which avatar
  // kind resolved, so parent layouts don't shift between images and sprites.
  // The image fills the box; the sprite is fit (and centered) within it —
  // `scale` acts as a max-zoom cap that `bounded` TilesetGroup clamps to the box.
  return (
    <>
      {resolved.kind === "image" ? (
        <MantineImage
          src={resolved.url}
          w={size}
          h={size}
          fit="cover"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <TilesetGroup scale={scale} group={resolved.group} bounded />
      )}
    </>
  );
}
