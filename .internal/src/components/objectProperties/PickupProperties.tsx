import { useAppSelector } from "@/hooks/redux";
import { collectPropertyValues } from "@/store/selectors";
import { PickupObj } from "@/types/map";
import { TileGroupTemplate } from "@/types/tilegroup";
import { updateObjects } from "@/utils/propertyEditor";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Fieldset, Stack, TextInput } from "@mantine/core";
import { memo, ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue from "../PropertyValue";
import TilesetGroup from "../TilesetGroup";
import HiddenInput from "./inputs/HiddenInput";
import IdInput from "./inputs/IdInput";
import LocalizedNameInput from "./inputs/LocalizedNameInput";
import TagsInput from "./inputs/TagsInput";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = ["id", "tags", "nameKey", "assetId", "hidden"] as const;

// Additional properties needed for identification
const TEMPLATE_PROPS = [] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function PickupProperties({ objs }: { objs: PickupObj[] }) {
  const { t } = useTranslation();

  const toCollect = useAppSelector((state) =>
    collectPropertyValues(state, objs, [...COLLECTED_PROPS]),
  );

  const nameInput = (
    <LocalizedNameInput
      description={t("pickupPropNameDescription")}
      noTemplate
      values={toCollect.nameKey}
      context={t("pickupPropNameContext")}
      keyPrefix={["pickup"]}
      placeholder={t("pickupPropNamePlaceholder")}
      onValueChange={({ value }): void => {
        updateObjects({
          objs,
          changes: {
            nameKey: value ?? null,
            status: value ? null : "error",
          },
        });
      }}
      required
    />
  );

  const tagsInput = (
    <TagsInput
      label={t("pickupPropTagsLabel")}
      description={t("pickupPropTagsDescription")}
      max={3}
      values={toCollect.tags}
      noTemplate
      onValueChange={({ value }: { value: string[] | undefined }) => {
        updateObjects({ objs, changes: { tags: value } });
      }}
      debounceMs={100}
      placeholder={t("pickupPropTagsPlaceholder")}
    />
  );

  // Get all tilesets to look up tilegroups
  const tilesets = useAppSelector((state) => state.tilesetEditor.tilesets);

  // Helper to find a tilegroup by its id across all tilesets
  const findTileGroup = useCallback(
    (tgId: string | null | undefined): TileGroupTemplate | null => {
      if (!tgId) return null;
      for (const ts of Object.values(tilesets)) {
        const tg = ts.tiles.entities[tgId];
        if (tg) {
          return tg as TileGroupTemplate;
        }
      }
      return null;
    },
    [tilesets],
  );

  const tgIdInput = (
    <PropertyValue
      label={t("pickupPropImageAssetLabel")}
      description={t("pickupPropImageAssetDescription")}
      values={toCollect.assetId}
      defaultValue={null}
      noTemplate={true}
      onValueChange={({
        value,
      }: {
        value: string | null | undefined;
      }): void => {
        updateObjects({ objs, changes: { assetId: value } });
      }}
      debounceMs={100}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
        const tilegroup = findTileGroup(value);
        return (
          <Stack key={key} gap="xs" p={0}>
            {value && tilegroup && (
              <TilesetGroup group={tilegroup} scale={4} bounded={false} />
            )}
            <TextInput
              defaultValue={value ?? ""}
              placeholder={t("pickupPropImageAssetPlaceholder")}
              onChange={(e) => onChange(e.target.value)}
            />
          </Stack>
        );
      }}
    />
  );

  const hiddenInput = (
    <HiddenInput
      description={t("pickupPropHiddenDescription")}
      values={toCollect.hidden}
      onValueChange={({ value }) =>
        updateObjects({ objs, changes: { hidden: value } })
      }
      noTemplate
      debounceMs={100}
    />
  );

  const idInput = <IdInput values={toCollect.id} />;

  return (
    <Fieldset legend={t("pickupPropLegend")} p="xs">
      <Stack p={0} gap="xl">
        {idInput}
        {nameInput}
        {tgIdInput}
        {tagsInput}
        {hiddenInput}
      </Stack>
    </Fieldset>
  );
}

export default memo(
  PickupProperties,
  createPropsEqualFn<PickupObj>(RELEVANT_PROPS),
);
