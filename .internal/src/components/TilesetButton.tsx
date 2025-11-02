import { useAppDispatch } from "@/hooks/redux";
import { store } from "@/store/store";
import { removeTilesetThunk } from "@/thunks/tileset";
import { DisplayableImage } from "@/types/image";
import { Image, Menu, Text, UnstyledButton } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconCopy, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

interface TilesetButtonProps {
  onClick: () => void;
  ts: DisplayableImage;
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
    const usedCount = objs.ids.reduce((acc, objId) => {
      const obj = objs.entities[objId];
      if ((obj as any).tilesetId === ts.id) {
        acc++;
      }
      return acc;
    }, 0);

    modals.openConfirmModal({
      title: "Delete tileset?",
      children: (
        <Text size="sm">
          Are you sure you want to delete this tileset? This action cannot be
          undone. <strong>{usedCount} objects are using this tileset.</strong>
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      centered: true,
      withCloseButton: false,
      onConfirm: () => {
        dispatch(removeTilesetThunk(ts.id));
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
