import { useAppDispatch } from "@/hooks/redux";
import { store } from "@/store/store";
import { removeTilesetThunk, replaceTilesetImageThunk } from "@/thunks/tileset";
import { isAnimationTemplate } from "@/types/animation";
import { isNpcTemplate } from "@/types/npc";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import { copyToClipboard } from "@/utils/copy";
import { Image, Menu, UnstyledButton } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconCopy, IconPhoto, IconTrash } from "@tabler/icons-react";
import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ItemStatus } from "./modals/ItemizedConfirmModal";
import styles from "./styles/TilesetButton.module.css";

interface TilesetButtonProps {
  onClick: () => void;
  ts: Tileset;
  isActive?: boolean;
}

export default function TilesetButton({
  onClick,
  ts,
  isActive,
}: TilesetButtonProps) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpened((o) => !o);
  };

  useEffect(() => {
    const close = () => setOpened(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const onDelete = () => {
    const state = store.getState();
    const objs = state.mapEditor.objects;

    const mapUses = objs.ids.reduce((acc, objId) => {
      const obj = objs.entities[objId];
      if ((obj as any).tilesetId === ts.id) {
        acc++;
      }
      return acc;
    }, 0);

    let pinnedGroups = 0;
    let animations = 0;
    let npcs = 0;
    for (const objId of ts.tiles.ids) {
      const obj = ts.tiles.entities[objId];
      if (isTileGroupTemplate(obj)) {
        if (obj.pinned) {
          pinnedGroups++;
        }
      } else if (isAnimationTemplate(obj)) {
        animations++;
      } else if (isNpcTemplate(obj)) {
        npcs++;
      }
    }

    const items: ItemStatus[] = [];

    items.push({
      ok: mapUses === 0,
      message:
        mapUses > 0
          ? t("tilesetBtnMapObjectsUseTileset", { count: mapUses })
          : t("tilesetBtnNoMapObjects"),
    });

    items.push({
      ok: pinnedGroups === 0,
      message:
        pinnedGroups > 0
          ? t("tilesetBtnContainsTileGroups", { count: pinnedGroups })
          : t("tilesetBtnNoCustomTileGroups"),
    });

    items.push({
      ok: animations === 0,
      message:
        animations > 0
          ? t("tilesetBtnContainsAnimations", { count: animations })
          : t("tilesetBtnNoAnimations"),
    });

    items.push({
      ok: npcs === 0,
      message:
        npcs > 0
          ? t("tilesetBtnContainsNpcs", { count: npcs })
          : t("tilesetBtnNoNpcs"),
    });

    modals.openContextModal({
      modal: "confirm",
      title: t("tilesetBtnDeleteTitle"),
      centered: true,
      withCloseButton: true,
      innerProps: {
        makeItems: () => items,
        confirmLabel: t("tilesetBtnDeleteConfirmLabel"),
        msg: t("tilesetBtnDeleteMsg"),
        onConfirm: () => {
          dispatch(removeTilesetThunk(ts.id));
        },
      },
    });
    setOpened(false);
  };

  const onReplaceImage = useCallback(() => {
    fileInputRef.current?.click();
    setOpened(false);
  }, []);

  const onFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Reset input so selecting the same file again triggers onChange
      e.target.value = "";
      const objectUrl = URL.createObjectURL(file);
      dispatch(replaceTilesetImageThunk({ tsId: ts.id, objectUrl })).then(() => {
        URL.revokeObjectURL(objectUrl);
      });
    },
    [dispatch, ts],
  );

  const onCopyId = useCallback(() => {
    copyToClipboard({ value: ts.id, t });
    setOpened(false);
  }, [ts, t]);

  return (
    <Menu shadow="md" width={200} opened={opened} position="right" withArrow>
      <Menu.Target>
        <UnstyledButton
          onContextMenu={onRightClick}
          p={0}
          onClick={onClick}
          className={classNames(styles.button, { [styles.active]: isActive })}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png"
            style={{ display: "none" }}
            onChange={onFileSelected}
          />
          <Image
            src={ts.objectUrl}
            draggable={false}
            className={styles.image}
          />
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item leftSection={<IconCopy size={14} />} onClick={onCopyId}>
          {t("tilesetBtnCopyId")}
        </Menu.Item>
        <Menu.Item leftSection={<IconPhoto size={14} />} onClick={onReplaceImage}>
          {t("tilesetBtnReplaceImageMenuItem")}
        </Menu.Item>
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={14} />}
          onClick={onDelete}
        >
          {t("tilesetBtnDeleteMenuItem")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
