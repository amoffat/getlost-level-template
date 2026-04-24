import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as uiActions } from "@/slices/ui";
import { shallowEqual } from "react-redux";
import { useTranslation } from "react-i18next";
import PaletteFilter, { FilterToggle } from "../PaletteFilter";

export default function ObjectsPaletteFilters() {
  const { t } = useTranslation();
  const filters = useAppSelector(
    (state) => state.ui.paletteFilterSwitches.objects,
    shallowEqual
  );
  const dispatch = useAppDispatch();

  const filterToggles: FilterToggle[] = [
    {
      key: "hide-animations",
      label: t("paletteFilterHideAnimationSprites"),
      checked: filters.hideAnimations,
      onChange: (checked) => {
        dispatch(
          uiActions.togglePaletteFilter({
            tab: "objects",
            filterKey: "hideAnimations",
            checked,
          })
        );
      },
    },
    {
      key: "hide-npcs",
      label: t("paletteFilterHideNpcTilesetSprites"),
      checked: filters.hideNpcLeftovers,
      onChange: (checked) => {
        dispatch(
          uiActions.togglePaletteFilter({
            tab: "objects",
            filterKey: "hideNpcLeftovers",
            checked,
          })
        );
      },
    },
    {
      key: "hide-unused",
      label: t("paletteFilterHideUnusedSprites"),
      checked: filters.hideUnusedObjects,
      onChange: (checked) => {
        dispatch(
          uiActions.togglePaletteFilter({
            tab: "objects",
            filterKey: "hideUnusedObjects",
            checked,
          })
        );
      },
    },
    {
      key: "show-tiles",
      label: t("paletteFilterShowOnlyTiles"),
      checked: filters.showOnlyTiles,
      onChange: (checked) => {
        dispatch(
          uiActions.togglePaletteFilter({
            tab: "objects",
            filterKey: "showOnlyTiles",
            checked,
          })
        );
      },
    },
    // Not needed since we can view them in the Tilesets tab via the Spotlight
    //
    // {
    //   key: "show-hidden-tilesets",
    //   label: "Show hidden tilesets",
    //   checked: filters.showHiddenTilesets,
    //   onChange: (checked) => {
    //     dispatch(
    //       uiActions.togglePaletteFilter({
    //         tab: "objects",
    //         filterKey: "showHiddenTilesets",
    //         checked,
    //       })
    //     );
    //   },
    // },
  ];

  return <PaletteFilter toggles={filterToggles} />;
}
