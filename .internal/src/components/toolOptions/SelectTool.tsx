import { WalkSound, walkSounds } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  actions as mapActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import {
  actions as tsActions,
  selectors as tsSelectors,
} from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { bringToTopThunk, sendToBottomThunk } from "@/thunks/map";
import { MapLayerName } from "@/types/layer";
import { TileGroupInstance } from "@/types/map";
import { TileGroupTemplate } from "@/types/tilegroup";
import { TilesetObjectTemplate } from "@/types/tilesetobject";
import {
  Button,
  Fieldset,
  Kbd,
  Select,
  Slider,
  Stack,
  TextInput,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowBarToDown,
  IconArrowBarToUp,
} from "@tabler/icons-react";
import { ReactNode, useCallback, useMemo } from "react";
import { shallowEqual } from "react-redux";
import PropertyValue, {
  PropertyValueInfo,
  PropertyValueLevel,
} from "../PropertyValue";
import Tip from "../Tip";

export default function SelectTool() {
  const selectedTgInstances = useAppSelector(
    mapSelectors.selectedTileGroupInstances
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
        <Fieldset legend="Object properties" mt="md" p="xs">
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
  const tmpls = useAppSelector(
    (state) =>
      tsSelectors.templatesFromInstanceIds(
        state,
        objs.map((o) => o.tsObjId)
      ),
    shallowEqual
  );

  type PropNames = "name" | "walkSound" | "friction" | "traction";

  const toCollect = useMemo(() => {
    const toCollect: {
      [K in PropNames]: PropertyValueInfo<NonNullable<TileGroupInstance[K]>>[];
    } = {
      name: [],
      friction: [],
      traction: [],
      walkSound: [],
    };

    // Helper function to collect property values with proper type narrowing
    const collectProperty = <
      K extends PropNames,
      V extends TileGroupInstance[K],
    >(
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
            sourceId: tmpl!.id,
            value: templateValue,
            level: "template",
          });
        }
      } else {
        valuesArray.push({
          sourceId: obj.id,
          value: instanceValue,
          level: "instance",
        });
      }
    };

    objs.forEach((obj, index) => {
      const tmpl = tmpls[index];
      for (const key of Object.keys(toCollect) as PropNames[]) {
        collectProperty(key, obj, tmpl);
      }
    });

    return toCollect;
  }, [objs, tmpls]);

  const updateProps = useCallback(
    (level: PropertyValueLevel, props: Partial<TileGroupInstance>) => {
      // If we're in template mode, all of the changes go to the template
      // objects
      if (level === "template") {
        // Object templates may come from different tilesets, so group by
        // tileset ID
        const changesByTs = new Map<string, string[]>();
        for (const obj of objs) {
          if (!changesByTs.has(obj.tilesetId)) {
            changesByTs.set(obj.tilesetId, []);
          }
          changesByTs.get(obj.tilesetId)!.push(obj.tsObjId);
        }

        // Apply the changes to each tileset's template objects, but only the
        // props for which the value is defined
        const definedProps = Object.entries(props).reduce(
          (acc, [key, value]) => {
            if (value !== undefined) {
              acc[key as keyof TilesetObjectTemplate] = value as any;
            }
            return acc;
          },
          {} as Partial<TilesetObjectTemplate>
        );

        for (const [tsId, tsObjIds] of changesByTs.entries()) {
          const changes = tsObjIds.map((tsObjId) => ({
            id: tsObjId,
            changes: definedProps,
          }));
          store.dispatch(tsActions.updateManyTilesetObjects({ tsId, changes }));
        }

        // Now unset the instance values so they inherit from the updated
        // templates
        const changes = [];
        const undefinedProps: Partial<TileGroupInstance> = {};
        for (const key of Object.keys(props) as (keyof TileGroupInstance)[]) {
          undefinedProps[key] = undefined;
        }
        for (const obj of objs) {
          changes.push({ id: obj.id, changes: undefinedProps });
        }
        store.dispatch(mapActions.updateMany(changes));
      }
      // Otherwise apply changes directly to the instances
      else {
        const changes = [];
        for (const obj of objs) {
          changes.push({ id: obj.id, changes: props });
        }
        store.dispatch(mapActions.updateMany(changes));
      }
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

  // Placeholder for future Tile Group properties
  return (
    <Stack p={0} gap="xl">
      {nameInput}
      {groundLayer && walkSoundInput}
      {groundLayer && frictionInput}
      {groundLayer && tractionInput}
    </Stack>
  );
}
