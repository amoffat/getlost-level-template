import * as constants from "@/constants";
import { useAppSelector } from "@/hooks/redux";
import { collectPropertyValues } from "@/store/selectors";
import { NpcInstance } from "@/types/map";
import { NpcProps } from "@/types/properties";
import {
  updateObjectProperties,
  updateTilesetTemplates,
} from "@/utils/propertyEditor";
import { createPropsEqualFn } from "@/utils/propertyKey";
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
import { memo, ReactElement, useCallback } from "react";
import AdvancedSection from "../common/AdvancedSection";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";
import GroundOffsetInput from "./inputs/GroundOffsetInput";
import LocalizedNameInput from "./inputs/LocalizedNameInput";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = [
  "nameKey",
  "walkSpeed",
  "dampenWalkCollisions",
  "groundOffset",
] as const;

// Additional properties needed for template resolution
const TEMPLATE_PROPS = ["id", "tsObjId", "tilesetId"] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function NpcProperties({ objs }: { objs: NpcInstance[] }) {
  const toCollect = useAppSelector((state) =>
    collectPropertyValues(state, objs, [...COLLECTED_PROPS]),
  );

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

  const nameInput = (
    <LocalizedNameInput
      description="A name for this character. Must be unique."
      values={toCollect.nameKey}
      context="Character name"
      keyPrefix={["char"]}
      onValueChange={({ scope, value }): void => {
        updateProps(scope, {
          nameKey: value,
        });
      }}
      required
    />
  );

  const walkSpeedInput = (
    <PropertyValue
      label="Walk speed"
      description="How quickly the NPC moves across the map."
      values={toCollect.walkSpeed}
      defaultValue={constants.defaultNpcWalkSpeed}
      onValueChange={({
        scope,
        value,
      }: {
        scope: PropertyValueScope;
        value: number | undefined;
      }): void => {
        updateProps(scope, { walkSpeed: value });
      }}
      debounceMs={100}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
        return (
          <Slider
            key={key}
            defaultValue={value ?? 0}
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
      onValueChange={({
        scope,
        value,
      }: {
        scope: PropertyValueScope;
        value: number | undefined;
      }): void => {
        updateProps(scope, { dampenWalkCollisions: value });
      }}
      debounceMs={100}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
        return (
          <Slider
            key={key}
            defaultValue={value ?? 0}
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
    <GroundOffsetInput
      description="Vertical offset of the NPC from the ground."
      tooltip="The ground offset adjusts the NPC's vertical position relative to the ground. Positive values will raise the NPC above the ground, while negative values will sink it below. This can be useful for NPCs that need to appear to be floating or partially submerged. Normally, this should be set to 0 for most NPCs."
      values={toCollect.groundOffset}
      onValueChange={({ scope, value }) =>
        updateProps(scope, { groundOffset: value })
      }
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
    <Fieldset legend="NPC properties" p="xs">
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
