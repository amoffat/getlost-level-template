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
import { useTranslation } from "react-i18next";
import { ItemStatus } from "./modals/ItemizedConfirmModal";

export default function Spotlight() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const globalActions = useMemo(
    () => [
      {
        id: "reset-all",
        label: t("spotlightResetAllLabel"),
        description: t("spotlightResetAllDesc"),
        onClick: () => {
          modals.openContextModal({
            modal: "confirm",
            title: t("spotlightResetModalTitle"),
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
                      ? t("spotlightNoMapObjects")
                      : t("spotlightMapObjsWillBeDeleted", { count: mapObjs }),
                });

                const numTilesets = Object.values(
                  state.tilesetEditor.tilesets,
                ).filter((ts) => !ts.hidden).length;
                items.push({
                  ok: numTilesets === 0,
                  message:
                    numTilesets === 0
                      ? t("spotlightNoTilesets")
                      : t("spotlightTilesetsWillBeDeleted", { count: numTilesets }),
                });

                const dialogues = state.dialogue.dialogues.ids.length;
                items.push({
                  ok: dialogues === 0,
                  message:
                    dialogues === 0
                      ? t("spotlightNoNpcDialogue")
                      : t("spotlightNpcDialoguesWillBeDeleted", { count: dialogues }),
                });

                const storyNodes = state.story.nodes.length;
                items.push({
                  ok: storyNodes === 0,
                  message:
                    storyNodes === 0
                      ? t("spotlightNoStoryNodes")
                      : t("spotlightStoryNodesWillBeDeleted", { count: storyNodes }),
                });

                return items;
              },
              confirmLabel: t("spotlightResetConfirmLabel"),
              msg: t("spotlightResetMsg"),
              onConfirm: () => dispatch(resetAllThunk()),
            },
          });
        },
        leftSection: <IconBiohazard />,
      },
    ],
    [dispatch, t],
  );

  useSpotlightActions("global", globalActions);

  const actions = useSpotlightActionsStore();

  return (
    <MantineSpotlight
      actions={actions}
      shortcut={["mod + K", "ctrl + K"]}
      centered
      nothingFound={t("spotlightNothingFound")}
      highlightQuery
      searchProps={{
        leftSection: <IconSearch size={20} stroke={1.5} />,
        placeholder: t("spotlightSearchPlaceholder"),
      }}
    />
  );
}
