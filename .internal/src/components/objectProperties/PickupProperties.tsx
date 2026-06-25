import { useCollectPropertyValues } from "@/hooks/useCollectPropertyValues";
import { useAppSelector } from "@/hooks/redux";
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
import LocalizedTextInput from "./inputs/LocalizedTextInput";
import TagsInput from "./inputs/TagsInput";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = [
  "id",
  "tags",
  "nameKey",
  "descriptionKey",
  "assetId",
  "hidden",
] as const;

// Additional properties needed for identification
const TEMPLATE_PROPS = [] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function PickupProperties({ objs }: { objs: PickupObj[] }) {
  const { t } = useTranslation();

  const toCollect = useCollectPropertyValues(objs, COLLECTED_PROPS);

  const nameInput = (
    <LocalizedTextInput
      label={t("localizedNameInputLabel")}
      description={t("pickupPropNameDescription")}
      noTemplate
      values={toCollect.nameKey}
      context={t("pickupPropNameContext")}
      keyPrefix={["pickup"]}
      placeholder={t("pickupPropNamePlaceholder")}
      required
      validator={(value) =>
        value.trim().length === 0 ? t("mustNotBeEmpty") : null
      }
      onValueChange={({ value }): void => {
        updateObjects({
          objs,
          changes: {
            nameKey: value ?? null,
            status: value ? null : "error",
          },
        });
      }}
    />
  );

  const descInput = (
    <LocalizedTextInput
      label={t("localizedDescriptionInputLabel")}
      multiline
      noTemplate
      required
      description={t("pickupPropDescriptionDescription")}
      values={toCollect.descriptionKey}
      context={t("pickupPropDescriptionContext")}
      keyPrefix={["pickup"]}
      validator={(value) =>
        value.trim().length === 0 ? t("mustNotBeEmpty") : null
      }
      onValueChange={({ value }): void => {
        updateObjects({
          objs,
          changes: {
            descriptionKey: value ?? null,
            status: value ? null : "error",
          },
        });
      }}
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
      required
      noTemplate={true}
      onValueChange={({
        value,
      }: {
        value: string | null | undefined;
      }): void => {
        updateObjects({
          objs,
          changes: { assetId: value, status: value ? null : "error" },
        });
      }}
      debounceMs={100}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
        const tilegroup = findTileGroup(value);
        const error = value?.trim().length ? null : t("mustNotBeEmpty");
        return (
          <Stack key={key} gap="xs" p={0}>
            {value && tilegroup && (
              <TilesetGroup group={tilegroup} scale={4} bounded={false} />
            )}
            <TextInput
              error={error}
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
        {descInput}
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
