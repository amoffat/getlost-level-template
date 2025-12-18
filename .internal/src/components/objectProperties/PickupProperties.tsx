import * as constants from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  actions as mapEditorActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import { PickupObj } from "@/types/map";
import { PickupProps } from "@/types/properties";
import { TileGroupTemplate } from "@/types/tilegroup";
import {
  collectPropertyValues,
  updateObjectProperties,
} from "@/utils/propertyEditor";
import { Fieldset, Stack, TagsInput, TextInput } from "@mantine/core";
import { ReactNode, useCallback, useMemo } from "react";
import PropertyValue, { PropertyValueLevel } from "../PropertyValue";
import TilesetGroup from "../TilesetGroup";
import { requiredUniqueName } from "./validators/name";

export default function PickupProperties({ objs }: { objs: PickupObj[] }) {
  const dispatch = useAppDispatch();
  const objsByTemplateId = useAppSelector((state) =>
    mapSelectors.objectsByTemplateId(state, constants.pickupTemplateId)
  );

  // All pickup objects use the same global pickup template
  const templateUpdate = useCallback(
    (_objs: PickupObj[], props: Partial<PickupProps>) => {
      dispatch(
        mapEditorActions.updateTemplate({
          name: "pickups",
          updates: props,
        })
      );
    },
    [dispatch]
  );

  const updateProps = useCallback(
    (level: PropertyValueLevel, props: Partial<PickupProps>) => {
      updateObjectProperties({
        level,
        objs,
        props,
        templateUpdate,
      });
    },
    [objs, templateUpdate]
  );

  const toCollect = useMemo(() => {
    return collectPropertyValues(objs, ["name", "tags", "assetId"]);
  }, [objs]);

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
    [existingNames]
  );

  const nameInput = (
    <PropertyValue
      label="Name"
      description="Unique identifier for this pickup"
      noTemplate
      values={toCollect.name}
      defaultValue=""
      onValueChange={(
        level: PropertyValueLevel,
        value: string | undefined
      ): void => {
        updateProps(level, {
          name: value,
          status: nameValidator(value) ? "error" : null,
        });
      }}
      renderInput={(
        value: string | undefined,
        onChange: (value: string) => void
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
      onValueChange={(level, value: string[] | undefined) => {
        updateProps(level, { tags: value });
      }}
      renderInput={(
        value: string[] | undefined,
        onChange: (value: string[]) => void
      ): ReactNode => {
        return (
          <TagsInput
            value={value ?? []}
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
    [tilesets]
  );

  const tgIdInput = (
    <PropertyValue
      label="Image asset"
      description="The tilegroup asset used to represent this pickup on the map"
      values={toCollect.assetId}
      defaultValue={null}
      noTemplate={true}
      onValueChange={(
        level: PropertyValueLevel,
        value: string | null | undefined
      ): void => {
        updateProps(level, { assetId: value });
      }}
      renderInput={(
        value: string | null | undefined,
        onChange: (value: string) => void
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

  return (
    <Fieldset legend="Pickup Properties" p="xs">
      <Stack p={0} gap="xl">
        {nameInput}
        {tgIdInput}
        {tagsInput}
      </Stack>
    </Fieldset>
  );
}
