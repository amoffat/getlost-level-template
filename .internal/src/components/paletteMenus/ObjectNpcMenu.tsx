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
import { useTranslation } from "react-i18next";
import FloatingMenu from "../FloatingMenu";

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
  const { t } = useTranslation();
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
          ? t("objNpcMenuMapObjectsUse", { count: mapUses })
          : t("objNpcMenuNotUsedInMap"),
    });

    // const hasWarning = items.some((item) => !item.ok);
    const onConfirm = () => {
      dispatch(
        tsActions.deletePaletteObjects({
          tsId: obj.tilesetId,
          ids: [obj.id],
        }),
      );
      notifications.show({
        title: t("objNpcMenuDeletedTitle"),
        message: t("objNpcMenuDeletedMsg", { name: obj.id }),
        autoClose: 3000,
      });
    };

    modals.openContextModal({
      modal: "confirm",
      title: t("objNpcMenuDeleteModalTitle"),
      centered: true,
      withCloseButton: true,
      innerProps: {
        makeItems: () => items,
        confirmLabel: t("objNpcMenuDeleteConfirmLabel"),
        msg: t("objNpcMenuDeleteMsg"),
        onConfirm,
      },
    });

    closeMenu();
  }, [obj, closeMenu, dispatch, t]);

  if (!obj) return null;

  return (
    <>
      <FloatingMenu pos={pos} opened={pos !== null} withArrow>
        <Menu.Label>{t("objNpcMenuLabel")}</Menu.Label>
        <Menu.Item leftSection={<IconCopy size={14} />} onClick={onCopyId}>
          {t("objNpcMenuCopyId")}
        </Menu.Item>

        <Menu.Divider />

        <Menu.Label>{t("objNpcMenuDangerZone")}</Menu.Label>
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={14} />}
          onClick={deleteObject}
        >
          {t("objNpcMenuDeleteMenuItem")}
        </Menu.Item>
      </FloatingMenu>
    </>
  );
}
