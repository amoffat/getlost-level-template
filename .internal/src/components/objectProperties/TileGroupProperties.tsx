import { WalkSound, walkSounds } from "@/constants";
import { useAppSelector } from "@/hooks/redux";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { MapLayerName } from "@/types/layer";
import { TileGroupInstance } from "@/types/map";
import { TileGroupProps } from "@/types/properties";
import {
  collectPropertyValues,
  updateObjectProperties,
  updateTilesetTemplates,
} from "@/utils/propertyEditor";
import { Fieldset, Select, Slider, Stack, TextInput } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { ReactNode, useCallback, useMemo } from "react";
import PropertyValue, { PropertyValueLevel } from "../PropertyValue";

export default function TileGroupProperties({
  objs,
}: {
  objs: TileGroupInstance[];
}) {
  const groundLayer = useAppSelector(
    (state) => state.mapEditor.layers.active === MapLayerName.Ground
  );

  const resolveTemplate = (obj: TileGroupInstance) => {
    const state = store.getState();
    return tsSelectors.templateFromInstanceId(
      state,
      obj.tsObjId
    ) as TileGroupProps;
  };

  const toCollect = useMemo(() => {
    return collectPropertyValues<TileGroupProps, TileGroupInstance>(
      objs,
      resolveTemplate,
      ["name", "walkSound", "friction", "traction"]
    );
  }, [objs]);

  const updateProps = useCallback(
    (level: PropertyValueLevel, props: Partial<TileGroupProps>) => {
      updateObjectProperties<TileGroupProps, TileGroupInstance>(
        level,
        objs,
        props,
        updateTilesetTemplates
      );
    },
    [objs]
  );

  const nameInput = (
    <PropertyValue
      label="Name"
      description="A name for this object. Does not have to be unique."
      values={toCollect.name}
      onValueChange={(
        level: PropertyValueLevel,
        value: string | undefined
      ): void => {
        updateProps(level, { name: value });
      }}
      renderInput={(
        value: string | null,
        onChange: (value: string) => void
      ): ReactNode => {
        return (
          <TextInput
            leftSection={value === null && <IconAlertTriangle size={14} />}
            value={value ?? ""}
            placeholder={value === null ? "Mixed values" : "Enter name"}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }}
    />
  );

  const walkSoundInput = (
    <PropertyValue
      label="Walk sound"
      description="The sound that will play when a character walks on this tile"
      values={toCollect.walkSound}
      onValueChange={function (
        level: PropertyValueLevel,
        value: WalkSound | undefined
      ): void {
        updateProps(level, { walkSound: value });
      }}
      renderInput={(
        value: WalkSound | null,
        onChange: (value: WalkSound) => void
      ): ReactNode => {
        return (
          <Select
            data={walkSounds}
            leftSection={value === null && <IconAlertTriangle size={14} />}
            value={value ?? undefined}
            placeholder={value === null ? "Mixed values" : "Select walk sound"}
            onChange={(val) => {
              if (val) onChange(val as WalkSound);
            }}
          />
        );
      }}
    />
  );

  const frictionInput = (
    <PropertyValue
      label="Friction"
      description="How much this tile resists movement. Higher values make it harder to slide."
      values={toCollect.friction}
      onValueChange={function (
        level: PropertyValueLevel,
        value: number | undefined
      ): void {
        updateProps(level, { friction: value });
      }}
      renderInput={(
        value: number | null,
        onChange: (value: number) => void
      ): ReactNode => {
        return (
          <Slider
            defaultValue={value ?? 0.5}
            min={0}
            max={1}
            step={0.01}
            onChangeEnd={onChange}
          />
        );
      }}
    />
  );

  const tractionInput = (
    <PropertyValue
      label="Traction"
      description="How much grip this tile provides. Higher values make it easier to change direction."
      values={toCollect.traction}
      onValueChange={(level: PropertyValueLevel, value: number | undefined) => {
        updateProps(level, { traction: value });
      }}
      renderInput={(
        value: number | null,
        onChange: (value: number) => void
      ): ReactNode => {
        return (
          <Slider
            defaultValue={value ?? 0.5}
            min={0}
            max={1}
            step={0.01}
            onChangeEnd={onChange}
          />
        );
      }}
    />
  );

  return (
    <Fieldset legend="Object properties" mt="md" p="xs">
      <Stack p={0} gap="xl">
        {nameInput}
        {groundLayer && walkSoundInput}
        {groundLayer && frictionInput}
        {groundLayer && tractionInput}
      </Stack>
    </Fieldset>
  );
}
