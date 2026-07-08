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
import { copyToClipboard } from "@/utils/copy";
import { Vector2 } from "@/vec";
import { Menu } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconTrash } from "@tabler/icons-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import FloatingMenu from "../FloatingMenu";

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
  const { t } = useTranslation();
  const tab = useAppSelector((state) => state.ui.activeTab);
  const dispatch = useAppDispatch();

  const onCopyId = useCallback(() => {
    if (!obj) return;
    copyToClipboard({ value: obj.id, t });
    closeMenu();
  }, [obj, closeMenu, t]);

  const deleteObject = useCallback(() => {
    if (!obj) return;

    const state = store.getState();
    const ts = tsSelectors.selectTileset(
      state,
      state.tilesetEditor.objIdToTs[obj.frames[0].tg.id],
    )!;

    const items: ItemStatus[] = [];

    const npcs = new Set<string>();
    for (const objId of ts.tiles.ids) {
      const maybeNpc = ts.tiles.entities[objId];
      if (isNpcTemplate(maybeNpc)) {
        const objFrames = new Set(obj.frames.map((frame) => frame.tg.id));
        for (const anim of Object.values(maybeNpc.animations)) {
          if (
            anim.animation.frames.some((frame) => objFrames.has(frame.tg.id))
          ) {
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
          ? t("objAnimMenuUsedByNpcs", { count: npcs.size })
          : t("objAnimMenuNoNpcs"),
    });

    items.push({
      ok: mapUses === 0,
      message:
        mapUses > 0
          ? t("objAnimMenuMapObjectsUse", { count: mapUses })
          : t("objAnimMenuNotUsedInMap"),
    });

    // const hasWarning = items.some((item) => !item.ok);
    const onConfirm = () => {
      dispatch(
        tsActions.deletePaletteObjects({
          ids: [obj.id],
          tsId: ts.id,
        }),
      );
      notifications.show({
        title: t("objAnimMenuDeletedTitle"),
        message: t("objAnimMenuDeletedMsg", { name: obj.slotNames }),
        autoClose: 3000,
      });
    };

    modals.openContextModal({
      modal: "confirm",
      title: t("objAnimMenuDeleteModalTitle"),
      centered: true,
      withCloseButton: true,
      innerProps: {
        makeItems: () => items,
        confirmLabel: t("objAnimMenuDeleteConfirmLabel"),
        msg: t("objAnimMenuDeleteMsg"),
        onConfirm,
      },
    });

    closeMenu();
  }, [obj, closeMenu, dispatch, t]);

  // const mapEd = tab === "map-editor";
  const tilesetEd = tab === "tileset-editor";
  if (!obj) return null;

  return (
    <>
      <FloatingMenu pos={pos} opened={pos !== null} withArrow>
        <Menu.Label>{t("objAnimMenuLabel")}</Menu.Label>
        <Menu.Item leftSection={<IconCopy size={14} />} onClick={onCopyId}>
          {t("objAnimMenuCopyId")}
        </Menu.Item>

        {tilesetEd && (
          <>
            <Menu.Divider />

            <Menu.Label>{t("objAnimMenuDangerZone")}</Menu.Label>
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={deleteObject}
            >
              {t("objAnimMenuDeleteMenuItem")}
            </Menu.Item>
          </>
        )}
      </FloatingMenu>
    </>
  );
}
