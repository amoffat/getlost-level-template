import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as uiActions } from "@/slices/ui";
import { shallowEqual } from "react-redux";
import { useTranslation } from "react-i18next";
import PaletteFilter, { FilterToggle } from "../PaletteFilter";

export default function AnimationsPaletteFilters() {
  const { t } = useTranslation();
  const filters = useAppSelector(
    (state) => state.ui.paletteFilterSwitches.animations,
    shallowEqual
  );
  const dispatch = useAppDispatch();

  const filterToggles: FilterToggle[] = [
    {
      key: "hide-npcs",
      label: t("paletteFilterHideNpcSprites"),
      checked: filters.hideNpcs,
      onChange: (checked) => {
        dispatch(
          uiActions.togglePaletteFilter({
            tab: "animations",
            filterKey: "hideNpcs",
            checked,
          })
        );
      },
    },
  ];

  return <PaletteFilter toggles={filterToggles} />;
}
