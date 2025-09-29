import { useAppSelector } from "@/hooks/redux";
import { TileGroup } from "@/types/tilegroup";
import { Vector } from "@/vec";
import { Input, Menu, Modal, Stack, TagsInput } from "@mantine/core";
import {
  IconBlocks,
  IconMapPin,
  IconStack2,
  IconTag,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";
import ObjectMenu from "./ObjectMenu";
import TilesetGroup from "./TilesetGroup";

interface TileGroupMenuProps {
  pos: Vector | null;
  group: TileGroup | null;
  closeMenu: () => void;
}

export default function TileGroupMenu({
  pos,
  group,
  closeMenu,
}: TileGroupMenuProps) {
  const tab = useAppSelector((state) => state.ui.activeTab);
  const [openTagsModal, setOpenTagsModal] = useState(false);

  const onTagsItemClicked = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      closeMenu();
      setOpenTagsModal(true);
    },
    [closeMenu]
  );

  return (
    <>
      <ObjectMenu pos={pos} opened={pos !== null}>
        {tab === "map-editor" && (
          <>
            <Menu.Label>Map Editor Actions</Menu.Label>
            <Menu.Item leftSection={<IconMapPin size={14} />}>Place</Menu.Item>
          </>
        )}
        <Menu.Label>Tile Group Actions</Menu.Label>

        <Menu.Item leftSection={<IconStack2 size={14} />}>
          Set z-index
        </Menu.Item>
        <Menu.Item leftSection={<IconBlocks size={14} />}>
          Set colliders
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTag size={14} />}
          onClick={onTagsItemClicked}
        >
          Set tags
        </Menu.Item>

        <Menu.Divider />

        <Menu.Label>Danger zone</Menu.Label>
        <Menu.Item color="red" leftSection={<IconTrash size={14} />}>
          Delete
        </Menu.Item>
      </ObjectMenu>

      <Modal
        centered={true}
        opened={openTagsModal}
        onClose={() => setOpenTagsModal(false)}
        title="Set tags"
      >
        <Stack p={0} align="stretch">
          {group && <TilesetGroup group={group} scale={4} />}
          <Input placeholder="Object name" />
          <TagsInput
            placeholder="Enter tag"
            splitChars={[",", " ", "|"]}
            limit={5}
            data={[]}
          />
        </Stack>
      </Modal>
    </>
  );
}
