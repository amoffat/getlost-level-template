import * as constants from "@/constants";
import { NpcInstance } from "@/types/map";
import { NpcProps } from "@/types/properties";
import {
  collectPropertyValues,
  updateObjectProperties,
  updateTilesetTemplates,
} from "@/utils/propertyEditor";
import { Fieldset, Slider, Stack, TextInput } from "@mantine/core";
import { ReactNode, useCallback, useMemo } from "react";
import PropertyValue, { PropertyValueLevel } from "../PropertyValue";

export default function NpcProperties({ objs }: { objs: NpcInstance[] }) {
  const toCollect = useMemo(() => {
    return collectPropertyValues(objs, [
      "name",
      "walkSpeed",
      "dampenWalkCollisions",
      "groundOffset",
    ]);
  }, [objs]);

  const updateProps = useCallback(
    (level: PropertyValueLevel, props: Partial<NpcProps>) => {
      updateObjectProperties({
        level,
        objs,
        props,
        templateUpdate: updateTilesetTemplates,
      });
    },
    [objs]
  );

  const nameInput = (
    <PropertyValue
      label="Name"
      description="A name for the NPC. Does not have to be unique."
      values={toCollect.name}
      defaultValue=""
      onValueChange={(
        level: PropertyValueLevel,
        value: string | undefined
      ): void => {
        updateProps(level, { name: value });
      }}
      renderInput={(
        value: string | undefined,
        onChange: (value: string) => void
      ): ReactNode => {
        return (
          <TextInput
            value={value ?? ""}
            placeholder="Enter name"
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
        level: PropertyValueLevel,
        value: number | undefined
      ): void => {
        updateProps(level, { walkSpeed: value });
      }}
      renderInput={(
        value: number | undefined,
        onChange: (value: number) => void
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
      defaultValue={0}
      onValueChange={(
        level: PropertyValueLevel,
        value: number | undefined
      ): void => {
        updateProps(level, { dampenWalkCollisions: value });
      }}
      renderInput={(
        value: number | undefined,
        onChange: (value: number) => void
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
      values={toCollect.groundOffset}
      defaultValue={0}
      onValueChange={(
        level: PropertyValueLevel,
        value: number | undefined
      ): void => {
        updateProps(level, { groundOffset: value });
      }}
      renderInput={(
        value: number | undefined,
        onChange: (value: number) => void
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

  return (
    <Fieldset legend="NPC properties" mt="md" p="xs">
      <Stack p={0} gap="xl">
        {nameInput}
        {walkSpeedInput}
        {groundOffsetInput}
        {dampenWalkCollisionsInput}
      </Stack>
    </Fieldset>
  );
}
