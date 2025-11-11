import { walkSounds } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { bringToTopThunk, sendToBottomThunk } from "@/thunks/map";
import { MapLayerName } from "@/types/layer";
import { TileGroupInstance } from "@/types/map";
import { TileGroupTemplate } from "@/types/tilegroup";
import {
  Button,
  Fieldset,
  Kbd,
  Select,
  Slider,
  Stack,
  TextInput,
} from "@mantine/core";
import { IconArrowBarToDown, IconArrowBarToUp } from "@tabler/icons-react";
import { ReactNode, useMemo } from "react";
import PropertyValue, {
  PropertyValueInfo,
  PropertyValueLevel,
} from "../PropertyValue";
import Tip from "../Tip";

export default function SelectTool() {
  const selectedTgInstances = useAppSelector(
    selectors.selectedTileGroupInstances
  );
  const dispatch = useAppDispatch();
  const groundLayer = useAppSelector(
    (state) => state.mapEditor.layers.active === MapLayerName.Ground
  );

  const tips: ReactNode[] = useMemo(() => {
    return [
      "Use click and drag to select multiple objects.",
      <>
        Hold <Kbd>Ctrl</Kbd> to add to or remove from the current selection.
      </>,
      "Click on an object to select it.",
      "Click on empty space to clear the selection.",
      "If you can't select an object, make sure the correct layer is active.",
    ];
  }, []);

  const onBringToTop = () => {
    dispatch(bringToTopThunk(selectedTgInstances));
  };

  const onSendToBottom = () => {
    dispatch(sendToBottomThunk(selectedTgInstances));
  };

  const props = useMemo(() => {
    if (selectedTgInstances.length === 0) return null;
    return <TileGroupProperties key="props" objs={selectedTgInstances} />;
  }, [selectedTgInstances]);

  const hasSelection = selectedTgInstances.length > 0;

  return (
    <>
      <Tip tips={tips} />
      {groundLayer && (
        <Fieldset legend="Ordering" p="xs">
          <Stack p={0}>
            <>
              <Button
                onClick={onBringToTop}
                variant="light"
                disabled={!hasSelection}
                leftSection={<IconArrowBarToUp size={14} />}
              >
                Bring to top
              </Button>
              <Button
                onClick={onSendToBottom}
                variant="light"
                disabled={!hasSelection}
                leftSection={<IconArrowBarToDown size={14} />}
              >
                Send to bottom
              </Button>
            </>
          </Stack>
        </Fieldset>
      )}

      {props && (
        <Fieldset legend="Properties" mt="md" p="xs">
          <Stack p={0}>{props}</Stack>
        </Fieldset>
      )}
    </>
  );
}

function TileGroupProperties({ objs }: { objs: TileGroupInstance[] }) {
  const groundLayer = useAppSelector(
    (state) => state.mapEditor.layers.active === MapLayerName.Ground
  );

  type propNames = "name" | "friction" | "traction";
  const toCollect: {
    [K in propNames]: PropertyValueInfo<NonNullable<TileGroupInstance[K]>>[];
  } = {
    name: [],
    friction: [],
    traction: [],
  };

  // Helper function to collect property values with proper type narrowing
  const collectProperty = <K extends propNames, V extends TileGroupInstance[K]>(
    key: K,
    obj: TileGroupInstance,
    tmpl: TileGroupTemplate | null
  ) => {
    const valuesArray = toCollect[key];
    const instanceValue = obj[key] as V;
    const templateValue = tmpl?.[key] as V;

    if (instanceValue === undefined) {
      if (templateValue !== undefined) {
        valuesArray.push({
          value: templateValue,
          level: "template",
        });
      }
    } else {
      valuesArray.push({
        value: instanceValue,
        level: "instance",
      });
    }
  };

  const state = store.getState();

  for (const obj of objs) {
    const tmpl = tsSelectors.templateFromInstanceId(
      state,
      obj.tsObjId
    ) as TileGroupTemplate | null;

    for (const key of Object.keys(toCollect) as (keyof typeof toCollect)[]) {
      collectProperty(key, obj, tmpl);
    }
  }

  const updateProps = (props: Partial<TileGroupInstance>) => {
    // Implementation for updating properties
  };

  const nameInput = (
    <PropertyValue
      label="Name"
      description="A name for this tile. Does not have to be unique."
      values={toCollect.name}
      onLevelChange={(level: PropertyValueLevel) => {
        //
      }}
      onValueChange={function (value: string): void {
        updateProps({ name: value });
      }}
      renderInput={(
        value: string | null,
        onChange: (value: string) => void
      ): ReactNode => {
        return (
          <TextInput
            value={value ?? undefined}
            placeholder={value === null ? "Mixed values" : "Enter name"}
            onChange={(e) => onChange(e.target.value)}
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
      onLevelChange={(level: PropertyValueLevel) => {
        //
      }}
      onValueChange={function (value: number): void {
        throw new Error("Function not implemented.");
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
      onLevelChange={(level: PropertyValueLevel) => {
        //
      }}
      onValueChange={function (value: number): void {
        throw new Error("Function not implemented.");
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

  const walkSoundInput = (
    <PropertyValue
      label="Walk sound"
      description="The sound that will play when a character walks on this tile"
      values={toCollect.name}
      onLevelChange={(level: PropertyValueLevel) => {
        //
      }}
      onValueChange={function (value: string): void {
        throw new Error("Function not implemented.");
      }}
      renderInput={(
        value: string | null,
        onChange: (value: string) => void
      ): ReactNode => {
        return (
          <Select
            data={walkSounds}
            value={value ?? undefined}
            placeholder={value === null ? "Mixed values" : "Select walk sound"}
            onChange={(val) => {
              if (val) onChange(val);
            }}
          />
        );
      }}
    />
  );

  // Placeholder for future Tile Group properties
  return (
    <>
      {nameInput}
      {groundLayer && walkSoundInput}
      {groundLayer && frictionInput}
      {groundLayer && tractionInput}
    </>
  );
}
