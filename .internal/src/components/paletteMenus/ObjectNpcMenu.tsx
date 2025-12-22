import { ItemStatus } from "@/components/modals/ItemizedConfirmModal";
import { useAppDispatch } from "@/hooks/redux";
import { actions as tsActions } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { isMapObjFromTileset } from "@/types/map";
import { NpcTemplate } from "@/types/npc";
import { Vector2 } from "@/vec";
import { Menu } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconTrash } from "@tabler/icons-react";
import { useCallback } from "react";
import ObjectMenu from "../ObjectMenu";

interface ObjectNpcMenuProps {
  pos: Vector2 | null;
  obj: NpcTemplate | null;
  closeMenu: () => void;
}

export default function ObjectNpcMenu({
  pos,
  obj,
  closeMenu,
}: ObjectNpcMenuProps) {
  const dispatch = useAppDispatch();

  const onCopyId = useCallback(() => {
    if (!obj) return;
    navigator.clipboard.writeText(obj.id);
    closeMenu();
  }, [obj, closeMenu]);

  const deleteObject = useCallback(() => {
    if (!obj) return;

    const state = store.getState();
    const items: ItemStatus[] = [];

    const mapObjs = state.mapEditor.objects;
    const mapUses = mapObjs.ids.reduce((acc, objId) => {
      const mapObj = mapObjs.entities[objId];
      if (isMapObjFromTileset(mapObj) && mapObj.tsObjId === obj.id) {
        acc++;
      }
      return acc;
    }, 0);

    items.push({
      ok: mapUses === 0,
      message:
        mapUses > 0
          ? `${mapUses} map objects use this NPC.`
          : "This NPC is not used in the map.",
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
        title: "NPC deleted",
        message: `Deleted NPC "${obj.name}".`,
        autoClose: 3000,
      });
    };

    modals.openContextModal({
      modal: "confirm",
      title: "Delete NPC?",
      centered: true,
      withCloseButton: true,
      innerProps: {
        makeItems: () => items,
        confirmLabel: "Yes, delete NPC",
        msg: "Are you sure you want to delete this NPC? This action cannot be undone.",
        onConfirm,
      },
    });

    closeMenu();
  }, [obj, closeMenu, dispatch]);

  if (!obj) return null;

  return (
    <>
      <ObjectMenu pos={pos} opened={pos !== null}>
        <Menu.Label>Object Npc Actions</Menu.Label>
        <Menu.Item leftSection={<IconCopy size={14} />} onClick={onCopyId}>
          Copy object id
        </Menu.Item>

        <Menu.Divider />

        <Menu.Label>Danger zone</Menu.Label>
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={14} />}
          onClick={deleteObject}
        >
          Delete
        </Menu.Item>
      </ObjectMenu>
    </>
  );
}
