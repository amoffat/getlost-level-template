import { ItemStatus } from "@/components/modals/ItemizedConfirmModal";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  actions as tsActions,
  selectors as tsSelectors,
} from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { AnimationTemplate } from "@/types/animation";
import { isMapObjFromTileset } from "@/types/map";
import { isNpcTemplate } from "@/types/npc";
import { Vector2 } from "@/vec";
import { Menu } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconTrash } from "@tabler/icons-react";
import { useCallback } from "react";
import ObjectMenu from "../ObjectMenu";

interface ObjectAnimationMenuProps {
  pos: Vector2 | null;
  obj: AnimationTemplate | null;
  closeMenu: () => void;
}

export default function ObjectAnimationMenu({
  pos,
  obj,
  closeMenu,
}: ObjectAnimationMenuProps) {
  const tab = useAppSelector((state) => state.ui.activeTab);
  const dispatch = useAppDispatch();

  const onCopyId = useCallback(() => {
    if (!obj) return;
    navigator.clipboard.writeText(obj.id);
    closeMenu();
  }, [obj, closeMenu]);

  const deleteObject = useCallback(() => {
    if (!obj) return;

    const state = store.getState();
    const ts = tsSelectors.selectTileset(state, obj.tilesetId)!;

    const items: ItemStatus[] = [];

    const npcs = new Set<string>();
    for (const objId of ts.tiles.ids) {
      const maybeNpc = ts.tiles.entities[objId];
      if (isNpcTemplate(maybeNpc)) {
        const objFrames = new Set(obj.frames.map((frame) => frame.tg.id));
        for (const anim of Object.values(maybeNpc.animations)) {
          if (anim.animation.frames.some((frame) => objFrames.has(frame.tg.id))) {
            npcs.add(maybeNpc.id);
          }
        }
      }
    }

    const mapObjs = state.mapEditor.objects;
    const mapUses = mapObjs.ids.reduce((acc, objId) => {
      const mapObj = mapObjs.entities[objId];
      if (isMapObjFromTileset(mapObj) && mapObj.tsObjId === obj.id) {
        acc++;
      }
      return acc;
    }, 0);

    items.push({
      ok: npcs.size === 0,
      message:
        npcs.size > 0
          ? `It is used by ${npcs.size} NPCs.`
          : "No NPCs use this animation.",
    });

    items.push({
      ok: mapUses === 0,
      message:
        mapUses > 0
          ? `${mapUses} map objects use this animation.`
          : "This animation is not used in the map.",
    });

    // const hasWarning = items.some((item) => !item.ok);
    const onConfirm = () => {
      dispatch(
        tsActions.deletePaletteObjects({
          tsId: obj.tilesetId,
          ids: [obj.id],
        })
      );
      notifications.show({
        title: "Animation deleted",
        message: `Deleted animation "${obj.names}".`,
        autoClose: 3000,
      });
    };

    modals.openContextModal({
      modal: "confirm",
      title: "Delete animation?",
      centered: true,
      withCloseButton: true,
      innerProps: {
        makeItems: () => items,
        confirmLabel: "Yes, delete animation",
        msg: "Are you sure you want to delete this animation? This action cannot be undone.",
        onConfirm,
      },
    });

    closeMenu();
  }, [obj, closeMenu, dispatch]);

  // const mapEd = tab === "map-editor";
  const tilesetEd = tab === "tileset-editor";
  if (!obj) return null;

  return (
    <>
      <ObjectMenu pos={pos} opened={pos !== null}>
        <Menu.Label>Object Animation Actions</Menu.Label>
        <Menu.Item leftSection={<IconCopy size={14} />} onClick={onCopyId}>
          Copy object id
        </Menu.Item>

        {tilesetEd && (
          <>
            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={deleteObject}
            >
              Delete
            </Menu.Item>
          </>
        )}
      </ObjectMenu>
    </>
  );
}
