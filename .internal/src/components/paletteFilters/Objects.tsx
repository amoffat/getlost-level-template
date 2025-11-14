import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as uiActions } from "@/slices/ui";
import { shallowEqual } from "react-redux";
import PaletteFilter, { FilterToggle } from "../PaletteFilter";

export default function ObjectsPaletteFilters() {
  const filters = useAppSelector(
    (state) => state.ui.paletteFilterSwitches.objects,
    shallowEqual
  );
  const dispatch = useAppDispatch();

  const filterToggles: FilterToggle[] = [
    {
      key: "hide-animations",
      label: "Hide sprites used in animations",
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
      label: "Hide sprites from NPC tilesets",
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
      label: "Hide unused sprites",
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
      label: "Show only solid tiles",
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
    {
      key: "show-hidden-tilesets",
      label: "Show hidden tilesets",
      checked: filters.showHiddenTilesets,
      onChange: (checked) => {
        dispatch(
          uiActions.togglePaletteFilter({
            tab: "objects",
            filterKey: "showHiddenTilesets",
            checked,
          })
        );
      },
    },
  ];

  return <PaletteFilter toggles={filterToggles} />;
}
