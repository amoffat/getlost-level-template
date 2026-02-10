import * as constants from "@/constants";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { NpcInstance } from "@/types/map";
import { NpcProps } from "@/types/properties";
import {
  collectPropertyValues,
  updateObjectProperties,
  updateTilesetTemplates,
} from "@/utils/propertyEditor";
import { createPropertyKey, createPropsEqualFn } from "@/utils/propertyKey";
import {
  ActionIcon,
  Box,
  Fieldset,
  Group,
  Slider,
  Stack,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";
import { memo, ReactNode, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import AdvancedSection from "../common/AdvancedSection";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";
import { requiredUniqueName } from "./validators/name";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = [
  "name",
  "walkSpeed",
  "dampenWalkCollisions",
  "groundOffset",
] as const;

// Additional properties needed for template resolution
const TEMPLATE_PROPS = ["id", "tsObjId", "tilesetId"] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function NpcProperties({ objs }: { objs: NpcInstance[] }) {
  // Create a key based only on relevant properties
  const propertyKey = createPropertyKey(objs, RELEVANT_PROPS);

  const toCollect = useMemo(() => {
    return collectPropertyValues(objs, [...COLLECTED_PROPS]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyKey]);

  const npcs = useSelector(mapSelectors.selectNpcs);

  const updateProps = useCallback(
    (scope: PropertyValueScope, props: Partial<NpcProps>) => {
      updateObjectProperties({
        scope,
        objs,
        props,
        templateUpdate: updateTilesetTemplates,
      });
    },
    [objs],
  );

  const existingNames = useMemo(() => {
    const skipIds = new Set(objs.map((obj) => obj.id));
    const names = npcs
      .filter((npc) => !skipIds.has(npc.id))
      .map((npc) => npc.name!);
    return new Set<string>(names);
  }, [npcs, objs]);

  const nameValidator = useCallback(
    (value: string | undefined) => {
      return requiredUniqueName(existingNames, value);
    },
    [existingNames],
  );

  const nameInput = (
    <PropertyValue
      label="Name"
      description="A name for the NPC. Must be unique."
      values={toCollect.name}
      noTemplate
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
            placeholder="Enter name"
            error={nameValidator(value)}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }}
    />
  );

  const walkSpeedInput = (
    <PropertyValue
      label="Walk speed"
      description="How quickly the NPC moves across the map."
      values={toCollect.walkSpeed}
      defaultValue={constants.defaultNpcWalkSpeed}
      onValueChange={(
        scope: PropertyValueScope,
        value: number | undefined,
      ): void => {
        updateProps(scope, { walkSpeed: value });
      }}
      renderInput={(
        value: number | undefined,
        onChange: (value: number) => void,
      ): ReactNode => {
        return (
          <Slider
            value={value ?? 0}
            onChange={onChange}
            min={0}
            max={1}
            step={0.01}
          />
        );
      }}
    />
  );

  const dampenWalkCollisionsInput = (
    <PropertyValue
      label="Dampen walk collisions"
      description="How much to slow the player's movement when colliding with this NPC."
      values={toCollect.dampenWalkCollisions}
      defaultValue={constants.defaultNpcDampen}
      onValueChange={(
        scope: PropertyValueScope,
        value: number | undefined,
      ): void => {
        updateProps(scope, { dampenWalkCollisions: value });
      }}
      renderInput={(
        value: number | undefined,
        onChange: (value: number) => void,
      ): ReactNode => {
        return (
          <Slider
            value={value ?? 0}
            onChange={onChange}
            min={0}
            max={1}
            step={0.01}
          />
        );
      }}
    />
  );

  const groundOffsetInput = (
    <PropertyValue
      label="Ground offset"
      description="Vertical offset of the NPC from the ground."
      tooltip="The ground offset adjusts the NPC's vertical position relative to the ground. Positive values will raise the NPC above the ground, while negative values will sink it below. This can be useful for NPCs that need to appear to be floating or partially submerged. Normally, this should be set to 0 for most NPCs."
      values={toCollect.groundOffset}
      defaultValue={0}
      onValueChange={(
        scope: PropertyValueScope,
        value: number | undefined,
      ): void => {
        updateProps(scope, { groundOffset: value });
      }}
      renderInput={(
        value: number | undefined,
        onChange: (value: number) => void,
      ): ReactNode => {
        return (
          <Slider
            value={value ?? 0}
            onChange={onChange}
            min={-16}
            max={16}
            step={1}
          />
        );
      }}
    />
  );

  let idInput;
  if (objs.length === 1) {
    const copyId = () => {
      navigator.clipboard.writeText(objs[0].id);
    };

    idInput = (
      <Group gap="xs" wrap="nowrap">
        <Box style={{ flex: 1 }}>
          <TextInput
            label="ID"
            description="The object's unique identifier."
            value={objs[0].id}
            disabled
          />
        </Box>
        <Tooltip label="Copy id">
          <ActionIcon onClick={copyId} variant="subtle" color="gray" size="sm">
            <IconCopy size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  }

  return (
    <Fieldset legend="NPC properties" mt="md" p="xs">
      <Stack p={0} gap="xl">
        {nameInput}
        {walkSpeedInput}
        {groundOffsetInput}
        {dampenWalkCollisionsInput}
        <AdvancedSection>{idInput}</AdvancedSection>
      </Stack>
    </Fieldset>
  );
}

export default memo(
  NpcProperties,
  createPropsEqualFn<NpcInstance>(RELEVANT_PROPS),
);
