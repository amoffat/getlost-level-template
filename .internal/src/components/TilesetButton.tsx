import { useAppDispatch } from "@/hooks/redux";
import { actions as tsActions } from "@/slices/tilesetEditor";
import { DisplayableImage } from "@/types/image";
import { Image, Menu, UnstyledButton } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";

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
    setOpened(false);
    dispatch(tsActions.removeTileset(ts.id));
  };

  return (
    <Menu shadow="md" width={200} opened={opened} position="right" withArrow>
      <Menu.Target>
        <UnstyledButton
          onContextMenu={onRightClick}
          p={0}
          onClick={onClick}
          style={(theme) => ({
            overflow: "hidden",
            border: isActive
              ? `2px solid ${theme.colors.blue[6]}`
              : "2px solid transparent",
            "&:hover": {
              borderColor: theme.colors.gray[4],
              cursor: "pointer",
            },
          })}
        >
          <Image src={ts.objectUrl} draggable={false} />
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
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
