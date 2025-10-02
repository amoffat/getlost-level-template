import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as tsActions } from "@/slices/tilesetEditor";
import { actions as uiActions, selectors as uiSelectors } from "@/slices/ui";
import { TileGroup } from "@/types/tilegroup";
import { Vector } from "@/vec";
import { Menu, Modal, Stack, TagsInput } from "@mantine/core";
import {
  IconBlocks,
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
  onTagsModalOpened?: VoidFunction;
  closeMenu: () => void;
}

export default function TileGroupMenu({
  pos,
  group,
  closeMenu,
  onTagsModalOpened,
}: TileGroupMenuProps) {
  const tab = useAppSelector((state) => state.ui.activeTab);
  const [openTagsModal, setOpenTagsModal] = useState(false);
  const tgTags = useAppSelector(uiSelectors.selectTilesetGroupTags);
  const dispatch = useAppDispatch();

  const onTagsItemClicked = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      closeMenu();
      setOpenTagsModal(true);
      onTagsModalOpened?.();
    },
    [closeMenu, onTagsModalOpened]
  );

  const addTag = useCallback(
    (tag: string) => {
      if (!group) return;
      if (group.tags.includes(tag)) return;
      tag = tag.trim();
      if (tag.length === 0) return;

      const allTags = Array.from(new Set(group.tags).add(tag));
      dispatch(
        tsActions.updateTileGroup({
          tsId: group.tilesetId,
          group,
          changes: { tags: allTags },
        })
      );
      dispatch(uiActions.addTilesetGroupTags([tag]));
    },
    [dispatch, group]
  );

  const removeTag = useCallback(
    (tag: string) => {
      if (!group) return;
      const allTags = group.tags.filter((t) => t !== tag);
      dispatch(
        tsActions.updateTileGroup({
          tsId: group.tilesetId,
          group,
          changes: { tags: allTags },
        })
      );
      dispatch(uiActions.removeTilesetGroupTags([tag]));
    },
    [dispatch, group]
  );

  // const mapEd = tab === "map-editor";
  const tilesetEd = tab === "tileset-editor";

  return (
    <>
      <ObjectMenu pos={pos} opened={pos !== null}>
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

        {tilesetEd && (
          <>
            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item color="red" leftSection={<IconTrash size={14} />}>
              Delete
            </Menu.Item>
          </>
        )}
      </ObjectMenu>

      <Modal
        centered={true}
        opened={openTagsModal}
        onClose={() => setOpenTagsModal(false)}
        title="Set tags"
      >
        <Stack p={0} align="stretch">
          {group && <TilesetGroup group={group} scale={4} />}
          <TagsInput
            placeholder="Enter tag"
            splitChars={[",", " ", "|"]}
            limit={5}
            onOptionSubmit={addTag}
            onRemove={removeTag}
            data={tgTags}
            defaultValue={group?.tags || []}
          />
        </Stack>
      </Modal>
    </>
  );
}
