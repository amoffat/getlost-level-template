import * as constants from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import {
  actions as mapEditorActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import { collectPropertyValues } from "@/store/selectors";
import { PickupObj } from "@/types/map";
import { PickupProps } from "@/types/properties";
import { TileGroupTemplate } from "@/types/tilegroup";
import { arrayEquals } from "@/utils/array";
import { resolveLocaleText } from "@/utils/locale";
import { updateObjectProperties } from "@/utils/propertyEditor";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Fieldset, Stack, TagsInput, TextInput } from "@mantine/core";
import { memo, ReactElement, useCallback, useMemo } from "react";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";
import TilesetGroup from "../TilesetGroup";
import HiddenInput from "./inputs/HiddenInput";
import LocalizedNameInput from "./inputs/LocalizedNameInput";
import { requiredUniqueName } from "./validators/name";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = ["nameKey", "tags", "assetId", "hidden"] as const;

// Additional properties needed for identification
const TEMPLATE_PROPS = ["id"] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function PickupProperties({ objs }: { objs: PickupObj[] }) {
  const dispatch = useAppDispatch();
  const objsByTemplateId = useAppSelector((state) =>
    mapSelectors.objectsByTemplateId(state, constants.pickupTemplateId),
  ) as PickupObj[];
  const defaultEntries = useAppSelector(localeSelectors.selectDefaultEntries);

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

  const existingNames = useMemo(() => {
    const names = new Set<string>();
    const skipIds = new Set(objs.map((obj) => obj.id));
    objsByTemplateId.forEach((obj) => {
      if (skipIds.has(obj.id)) return;
      if (!obj.nameKey) return;

      const name = resolveLocaleText({
        key: obj.nameKey,
        primaryEntries: defaultEntries,
      });
      names.add(name);
    });
    return names;
  }, [defaultEntries, objsByTemplateId, objs]);

  const nameValidator = useCallback(
    (value: string | undefined) => {
      return requiredUniqueName(existingNames, value);
    },
    [existingNames],
  );

  const nameInput = (
    <LocalizedNameInput
      description="Unique identifier for this pickup"
      noTemplate
      values={toCollect.nameKey}
      context="Pickup name"
      keyPrefix={["pickup"]}
      validator={nameValidator}
      placeholder="Enter pickup name"
      onValueChange={({ scope, value }): void => {
        const text = resolveLocaleText({
          key: value,
          primaryEntries: defaultEntries,
        });
        updateProps(scope, {
          nameKey: value ?? null,
          status: nameValidator(text) ? "error" : null,
        });
      }}
      required
    />
  );

  const tagsInput = (
    <PropertyValue
      label="Tags"
      description="Tags for categorizing this pickup"
      values={toCollect.tags}
      defaultValue={[]}
      areEqual={arrayEquals}
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
            defaultValue={value}
            onChange={onChange}
            placeholder="Enter tags"
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
      label="Image asset"
      description="The tilegroup asset used to represent this pickup on the map"
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
              placeholder="Paste object ID"
              onChange={(e) => onChange(e.target.value)}
            />
          </Stack>
        );
      }}
    />
  );

  const hiddenInput = (
    <HiddenInput
      description="Whether the pickup starts off hidden on the map."
      values={toCollect.hidden}
      onValueChange={({ scope, value }) =>
        updateProps(scope, { hidden: value })
      }
      noTemplate
      debounceMs={100}
    />
  );

  return (
    <Fieldset legend="Pickup Properties" p="xs">
      <Stack p={0} gap="xl">
        {nameInput}
        {tgIdInput}
        {hiddenInput}
        {tagsInput}
      </Stack>
    </Fieldset>
  );
}

export default memo(
  PickupProperties,
  createPropsEqualFn<PickupObj>(RELEVANT_PROPS),
);
