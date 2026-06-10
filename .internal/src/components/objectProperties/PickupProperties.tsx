import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { collectPropertyValues } from "@/store/selectors";
import { PickupObj } from "@/types/map";
import { PickupProps } from "@/types/properties";
import { TileGroupTemplate } from "@/types/tilegroup";
import { shallowEquals } from "@/utils/array";
import { updateObjectProperties } from "@/utils/propertyEditor";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Fieldset, Stack, TagsInput, TextInput } from "@mantine/core";
import { memo, ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";
import TilesetGroup from "../TilesetGroup";
import HiddenInput from "./inputs/HiddenInput";
import IdInput from "./inputs/IdInput";
import LocalizedNameInput from "./inputs/LocalizedNameInput";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = ["id", "tags", "nameKey", "assetId", "hidden"] as const;

// Additional properties needed for identification
const TEMPLATE_PROPS = [] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function PickupProperties({ objs }: { objs: PickupObj[] }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  // All pickup objects use the same global pickup template
  const templateUpdate = useCallback(
    (_objs: PickupObj[], props: Partial<PickupProps>) => {
      dispatch(
        mapEditorActions.updateTemplate({
          name: "pickups",
          updates: props,
        }),
      );
    },
    [dispatch],
  );

  const updateProps = useCallback(
    (scope: PropertyValueScope, props: Partial<PickupProps>) => {
      updateObjectProperties({
        scope,
        objs,
        props,
        templateUpdate,
      });
    },
    [objs, templateUpdate],
  );

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
      onValueChange={({ scope, value }): void => {
        updateProps(scope, {
          nameKey: value ?? null,
          status: value ? null : "error",
        });
      }}
      required
    />
  );

  const tagsInput = (
    <PropertyValue
      label={t("pickupPropTagsLabel")}
      description={t("pickupPropTagsDescription")}
      values={toCollect.tags}
      noTemplate
      defaultValue={[]}
      areEqual={shallowEquals}
      onValueChange={({
        scope,
        value,
      }: {
        scope: PropertyValueScope;
        value: string[] | undefined;
      }) => {
        updateProps(scope, { tags: value });
      }}
      debounceMs={100}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
        return (
          <TagsInput
            key={key}
            error={validator?.(value ?? undefined)}
            defaultValue={value}
            onChange={onChange}
            placeholder={t("pickupPropTagsPlaceholder")}
            splitChars={[",", " ", "|"]}
          />
        );
      }}
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
        scope,
        value,
      }: {
        scope: PropertyValueScope;
        value: string | null | undefined;
      }): void => {
        updateProps(scope, { assetId: value });
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
      onValueChange={({ scope, value }) =>
        updateProps(scope, { hidden: value })
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
