import * as constants from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import {
  actions as mapEditorActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import { collectPropertyValues } from "@/store/selectors";
import { ExitObj } from "@/types/map";
import { ExitProps } from "@/types/properties";
import { resolveLocaleText } from "@/utils/locale";
import { updateObjectProperties } from "@/utils/propertyEditor";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Button, Fieldset, Slider, Stack, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { memo, ReactElement, useCallback, useMemo } from "react";
import GatewayModal from "../GatewayModal";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";
import LocalizedNameInput from "./inputs/LocalizedNameInput";
import SwitchInput from "./inputs/SwitchInput";
import { requiredUniqueName } from "./validators/name";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = [
  "nameKey",
  "preferredEntranceId",
  "force",
  "sensorRadius",
] as const;

// Additional properties needed for identification
const TEMPLATE_PROPS = ["id"] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function ExitProperties({ objs }: { objs: ExitObj[] }) {
  const dispatch = useAppDispatch();
  const objsByTemplateId = useAppSelector((state) =>
    mapSelectors.objectsByTemplateId(state, constants.exitTemplateId),
  ) as ExitObj[];
  const defaultEntries = useAppSelector(localeSelectors.selectDefaultEntries);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  // All exit objects use the same global exit template
  const templateUpdate = useCallback(
    (_objs: ExitObj[], props: Partial<ExitProps>) => {
      dispatch(
        mapEditorActions.updateTemplate({
          name: "exitGateways",
          updates: props,
        }),
      );
    },
    [dispatch],
  );

  const updateProps = useCallback(
    (scope: PropertyValueScope, props: Partial<ExitProps>) => {
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

  const handleModalSubmit = useCallback(
    (gatewayId: string, numericRepoId: string | null) => {
      // Update the entrance id with the format: repoId/entranceId
      const formattedEntranceId = numericRepoId
        ? `${numericRepoId}/${gatewayId}`
        : gatewayId;

      updateProps("instance", { preferredEntranceId: formattedEntranceId });
    },
    [updateProps],
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
      description="A name of the exit. Must be unique."
      noTemplate
      values={toCollect.nameKey}
      context="Exit name"
      keyPrefix={["exit"]}
      validator={nameValidator}
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

  const prefEntrance = toCollect.preferredEntranceId[0]?.value ?? "";
  const hasPrefEntrance = prefEntrance.trim() !== "";

  const preferredEntranceInput = (
    <PropertyValue<string | null>
      label="Preferred entrance"
      description="If an entrance matching this id attaches to this exit, it will be permanently attached."
      noTemplate
      values={toCollect.preferredEntranceId}
      defaultValue={null}
      debounceMs={100}
      onValueChange={({
        scope,
        value,
      }: {
        scope: PropertyValueScope;
        value: string | null | undefined;
      }): void => {
        updateProps(scope, { preferredEntranceId: value });
      }}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
        return (
          <Stack key={key} gap="xs" p={0}>
            {value && (
              <TextInput
                defaultValue={value}
                placeholder="Enter entrance id"
                onChange={(e) => {
                  onChange(e.target.value);
                }}
              />
            )}

            {!hasPrefEntrance && (
              <Button size="xs" fullWidth onClick={openModal}>
                Add connection
              </Button>
            )}
          </Stack>
        );
      }}
    />
  );

  const forceInput = (
    <SwitchInput
      label="Force exit?"
      description="A forced exit does not give the player a choice to stay."
      values={toCollect.force}
      onValueChange={({ scope, value }) => updateProps(scope, { force: value })}
      noTemplate
      debounceMs={100}
    />
  );

  const sensorSizeInput = (
    <PropertyValue<number | undefined>
      label="Sensor radius"
      description="The radius that triggers the player to exit."
      values={toCollect.sensorRadius}
      defaultValue={constants.defaultExitSensorRadius}
      noTemplate
      onValueChange={({
        scope,
        value,
      }: {
        scope: PropertyValueScope;
        value: number | undefined;
      }): void => {
        updateProps(scope, { sensorRadius: value });
      }}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
        return (
          <Slider
            key={key}
            defaultValue={value}
            min={8}
            max={64}
            step={0.01}
            onChange={onChange}
          />
        );
      }}
    />
  );

  const singleSelected = objs.length === 1;

  return (
    <>
      <Fieldset legend="Exit properties" p="xs">
        <Stack p={0} gap="xl">
          {singleSelected && nameInput}
          {forceInput}
          {singleSelected && preferredEntranceInput}
          {sensorSizeInput}
        </Stack>
      </Fieldset>

      <GatewayModal
        opened={modalOpened}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        gatewayLabel="Entrance name"
        gatewayPlaceholder="Select an entrance"
        gatewayDescription="Enter a Github repository ID first"
      />
    </>
  );
}

export default memo(
  ExitProperties,
  createPropsEqualFn<ExitObj>(RELEVANT_PROPS),
);
