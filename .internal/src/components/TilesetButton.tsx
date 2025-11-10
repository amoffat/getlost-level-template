import { useAppDispatch } from "@/hooks/redux";
import { store } from "@/store/store";
import { removeTilesetThunk } from "@/thunks/tileset";
import { isAnimationTemplate } from "@/types/animation";
import { isNpcTemplate } from "@/types/npc";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import { Image, Menu, UnstyledButton } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconCopy, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { ItemStatus } from "./modals/ItemizedConfirmModal";

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
  const [opened, setOpened] = useState(false);
  const dispatch = useAppDispatch();

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
          ? `${mapUses} map objects use this tileset.`
          : "No map objects are using this tileset.",
    });

    items.push({
      ok: pinnedGroups === 0,
      message:
        pinnedGroups > 0
          ? `It contains custom ${pinnedGroups} tile groups.`
          : "It contains no custom tile groups.",
    });

    items.push({
      ok: animations === 0,
      message:
        animations > 0
          ? `It contains ${animations} animations.`
          : "It contains no animations.",
    });

    items.push({
      ok: npcs === 0,
      message: npcs > 0 ? `It contains ${npcs} NPCs.` : "It contains no NPCs.",
    });

    modals.openContextModal({
      modal: "confirm",
      title: "Delete tileset?",
      centered: true,
      withCloseButton: true,
      innerProps: {
        makeItems: () => items,
        confirmLabel: "Yes, delete tileset",
        msg: "Are you sure you want to delete this tileset? This action cannot be undone.",
        onConfirm: () => {
          dispatch(removeTilesetThunk(ts.id));
        },
      },
    });
    setOpened(false);
  };

  const onCopyId = useCallback(() => {
    navigator.clipboard.writeText(ts.id);
    setOpened(false);
  }, [ts]);

  return (
    <Menu shadow="md" width={200} opened={opened} position="right" withArrow>
      <Menu.Target>
        <UnstyledButton
          onContextMenu={onRightClick}
          p={0}
          onClick={onClick}
          style={(theme) => ({
            overflow: "hidden",
            outline: isActive ? `2px solid rgb(0, 255, 0)` : null,
            "&:hover": {
              outlineColor: theme.colors.gray[4],
              cursor: "pointer",
            },
          })}
        >
          <Image
            src={ts.objectUrl}
            draggable={false}
            style={{
              imageRendering: "pixelated",
            }}
          />
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item leftSection={<IconCopy size={14} />} onClick={onCopyId}>
          Copy tileset id
        </Menu.Item>
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={14} />}
          onClick={onDelete}
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
