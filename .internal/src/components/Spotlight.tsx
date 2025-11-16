import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { brokenTileGroups } from "@/selectors/map";
import { actions as uiActions } from "@/slices/ui";
import { store } from "@/store/store";
import { resetAllThunk, resetMapThunk } from "@/thunks/map";
import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  Spotlight as MantineSpotlight,
  SpotlightActionData,
} from "@mantine/spotlight";
import {
  IconEye,
  IconSearch,
  IconTrash,
  IconUnlink,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { ItemStatus } from "./modals/ItemizedConfirmModal";

export default function Spotlight() {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector((state) => state.ui.activeTab);

  const actions: SpotlightActionData[] = useMemo(() => {
    const actions = [
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

                const tilesets = Object.keys(
                  state.tilesetEditor.tilesets
                ).length;
                items.push({
                  ok: tilesets === 0,
                  message:
                    tilesets === 0
                      ? "You have no tilesets."
                      : `${tilesets} tilesets will be deleted.`,
                });

                const dialogues = state.dialogue.nodes.length;
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
        leftSection: <IconTrash />,
      },
    ];

    if (activeTab === "map-editor") {
      actions.push(
        ...[
          {
            id: "clear-broken",
            label: "Clear broken objects",
            description:
              "Remove references to missing tilesets or objects from the map",
            onClick: () => {
              modals.openContextModal({
                modal: "confirm",
                title: "Clear broken references?",
                centered: true,
                withCloseButton: true,
                innerProps: {
                  makeItems: () => {
                    const items: ItemStatus[] = [];
                    const state = store.getState();
                    const broken = brokenTileGroups(state);
                    items.push({
                      ok: broken.length === 0,
                      message:
                        broken.length === 0
                          ? "No broken tiles found."
                          : `Found ${broken.length} broken tiles`,
                    });
                    return items;
                  },
                  confirmLabel: "Yes, clear references",
                  msg: "Are you sure you want to clear all broken references? This will delete all map objects that are not backed by a tileset. This action cannot be undone.",
                  onConfirm: () => {},
                },
              });
            },
            leftSection: <IconUnlink />,
          },
          {
            id: "reset-map",
            label: "Reset map",
            description: "Delete all objects in the current map",
            onClick: () => {
              modals.openConfirmModal({
                title: "Reset map?",
                children: (
                  <Text size="sm">
                    This will delete everything in the map. This action cannot
                    be undone.
                  </Text>
                ),
                labels: { confirm: "Reset map", cancel: "Cancel" },
                confirmProps: { color: "red" },
                centered: true,
                withCloseButton: false,
                onConfirm: () => dispatch(resetMapThunk()),
              });
            },
            leftSection: <IconTrash />,
          },
        ]
      );
    } else if (activeTab === "tileset-editor") {
      actions.push(
        ...[
          {
            id: "toggle-hidden-tilesets",
            label: "Toggle hidden tilesets",
            description: "Toggle hidden tilesets",
            leftSection: <IconEye />,
            onClick: () => {
              const state = store.getState();
              const current = state.ui.flags.showHiddenTilesets;
              dispatch(uiActions.setFlags({ showHiddenTilesets: !current }));
            },
          },
        ]
      );
    }

    actions.sort((a, b) => a.label.localeCompare(b.label));

    return actions;
  }, [dispatch, activeTab]);

  return (
    <MantineSpotlight
      actions={actions}
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
