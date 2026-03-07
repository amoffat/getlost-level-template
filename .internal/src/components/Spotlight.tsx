import { useAppDispatch } from "@/hooks/redux";
import {
  useSpotlightActions,
  useSpotlightActionsStore,
} from "@/hooks/useSpotlightActions";
import { store } from "@/store/store";
import { resetAllThunk } from "@/thunks/map";
import { modals } from "@mantine/modals";
import { Spotlight as MantineSpotlight } from "@mantine/spotlight";
import { IconBiohazard, IconSearch } from "@tabler/icons-react";
import { useMemo } from "react";
import { ItemStatus } from "./modals/ItemizedConfirmModal";

export default function Spotlight() {
  const dispatch = useAppDispatch();

  const globalActions = useMemo(
    () => [
      {
        id: "reset-all",
        label: "Reset all",
        description: "Delete everything in the project",
        onClick: () => {
          modals.openContextModal({
            modal: "confirm",
            title: "Reset the project?",
            centered: true,
            withCloseButton: true,
            innerProps: {
              makeItems: () => {
                const items: ItemStatus[] = [];
                const state = store.getState();

                const mapObjs = state.mapEditor.objects.ids.length;
                items.push({
                  ok: mapObjs === 0,
                  message:
                    mapObjs === 0
                      ? "You have no objects in the map."
                      : `${mapObjs} map objects will be deleted.`,
                });

                const numTilesets = Object.values(
                  state.tilesetEditor.tilesets,
                ).filter((ts) => !ts.hidden).length;
                items.push({
                  ok: numTilesets === 0,
                  message:
                    numTilesets === 0
                      ? "You have no tilesets."
                      : `${numTilesets} tilesets will be deleted.`,
                });

                const dialogues = state.dialogue.dialogues.ids.length;
                items.push({
                  ok: dialogues === 0,
                  message:
                    dialogues === 0
                      ? "You have no NPC dialogue."
                      : `${dialogues} NPC dialogues will be deleted.`,
                });

                const storyNodes = state.story.nodes.length;
                items.push({
                  ok: storyNodes === 0,
                  message:
                    storyNodes === 0
                      ? "You have no story nodes."
                      : `${storyNodes} story nodes will be deleted.`,
                });

                return items;
              },
              confirmLabel: "Yes, reset all",
              msg: "Are you sure you want to reset everything? This action cannot be undone.",
              onConfirm: () => dispatch(resetAllThunk()),
            },
          });
        },
        leftSection: <IconBiohazard />,
      },
    ],
    [dispatch],
  );

  useSpotlightActions("global", globalActions);

  const actions = useSpotlightActionsStore();

  return (
    <MantineSpotlight
      actions={actions}
      shortcut={["mod + K", "ctrl + K"]}
      centered
      nothingFound="Nothing found..."
      highlightQuery
      searchProps={{
        leftSection: <IconSearch size={20} stroke={1.5} />,
        placeholder: "Search...",
      }}
    />
  );
}
