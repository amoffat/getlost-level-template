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
      key: "show-animations",
      label: "Hide objects used in animations",
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
  ];

  return <PaletteFilter toggles={filterToggles} />;
}
