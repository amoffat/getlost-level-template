import * as constants from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  actions as mapEditorActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import { PickupObj } from "@/types/map";
import { PickupProps } from "@/types/properties";
import { TileGroupTemplate } from "@/types/tilegroup";
import { arrayEquals } from "@/utils/array";
import {
  collectPropertyValues,
  updateObjectProperties,
} from "@/utils/propertyEditor";
import { createPropertyKey, createPropsEqualFn } from "@/utils/propertyKey";
import { Fieldset, Stack, Switch, TagsInput, TextInput } from "@mantine/core";
import { memo, ReactNode, useCallback, useMemo } from "react";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";
import TilesetGroup from "../TilesetGroup";
import { requiredUniqueName } from "./validators/name";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = ["name", "tags", "assetId", "hidden"] as const;

// Additional properties needed for identification
const TEMPLATE_PROPS = ["id"] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function PickupProperties({ objs }: { objs: PickupObj[] }) {
  const dispatch = useAppDispatch();
  const objsByTemplateId = useAppSelector((state) =>
    mapSelectors.objectsByTemplateId(state, constants.pickupTemplateId),
  );

  // Create a key based only on relevant properties
  const propertyKey = createPropertyKey(objs, RELEVANT_PROPS);

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

  const toCollect = useMemo(() => {
    return collectPropertyValues(objs, [...COLLECTED_PROPS]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyKey]);

  const existingNames = useMemo(() => {
    const names = new Set<string>();
    const skipIds = new Set(objs.map((obj) => obj.id));
    objsByTemplateId.forEach((obj) => {
      if (skipIds.has(obj.id)) {
        return;
      }
      const name = (obj as PickupObj).name;
      if (name) {
        names.add(name);
      }
    });
    return names;
  }, [objsByTemplateId, objs]);

  const nameValidator = useCallback(
    (value: string | undefined) => {
      return requiredUniqueName(existingNames, value);
    },
    [existingNames],
  );

  const nameInput = (
    <PropertyValue
      label="Name"
      description="Unique identifier for this pickup"
      noTemplate
      values={toCollect.name}
      defaultValue=""
      onValueChange={(
        scope: PropertyValueScope,
        value: string | undefined,
      ): void => {
        updateProps(scope, {
          name: value,
          status: nameValidator(value) ? "error" : null,
        });
      }}
      renderInput={(
        value: string | undefined,
        onChange: (value: string) => void,
      ): ReactNode => {
        return (
          <TextInput
            value={value ?? ""}
            placeholder="Enter pickup name"
            error={nameValidator(value)}
            onChange={(e) => onChange(e.target.value)}
            required
          />
        );
      }}
    />
  );

  const tagsInput = (
    <PropertyValue
      label="Tags"
      description="Tags for categorizing this pickup"
      values={toCollect.tags}
      defaultValue={[]}
      areEqual={arrayEquals}
      onValueChange={(scope, value: string[] | undefined) => {
        updateProps(scope, { tags: value });
      }}
      renderInput={(
        value: string[] | undefined,
        onChange: (value: string[]) => void,
      ): ReactNode => {
        return (
          <TagsInput
            value={value}
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
      onValueChange={(
        scope: PropertyValueScope,
        value: string | null | undefined,
      ): void => {
        updateProps(scope, { assetId: value });
      }}
      renderInput={(
        value: string | null | undefined,
        onChange: (value: string) => void,
      ): ReactNode => {
        const tilegroup = findTileGroup(value);
        return (
          <Stack gap="xs" p={0}>
            {value && tilegroup && (
              <TilesetGroup group={tilegroup} scale={4} bounded={false} />
            )}
            <TextInput
              value={value ?? ""}
              placeholder="Paste object ID"
              onChange={(e) => onChange(e.target.value)}
            />
          </Stack>
        );
      }}
    />
  );

  const hiddenInput = (
    <PropertyValue
      label="Hidden"
      description="Whether the pickup starts off hidden on the map."
      values={toCollect.hidden}
      defaultValue={false}
      noTemplate
      onValueChange={(
        scope: PropertyValueScope,
        value: boolean | undefined,
      ): void => {
        updateProps(scope, { hidden: value });
      }}
      renderInput={(
        value: boolean | undefined,
        onChange: (value: boolean) => void,
      ): ReactNode => {
        return (
          <Switch
            checked={value ?? false}
            onChange={(e) => onChange(e.currentTarget.checked)}
          />
        );
      }}
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
