import * as constants from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  actions as mapEditorActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import { ExitObj } from "@/types/map";
import { ExitProps } from "@/types/properties";
import {
  collectPropertyValues,
  updateObjectProperties,
} from "@/utils/propertyEditor";
import { createPropertyKey, createPropsEqualFn } from "@/utils/propertyKey";
import { Button, Fieldset, Slider, Stack, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { memo, ReactElement, useCallback, useMemo } from "react";
import GatewayModal from "../GatewayModal";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";
import SwitchInput from "./inputs/SwitchInput";
import { requiredUniqueName } from "./validators/name";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = [
  "name",
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
  );
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  // Create a key based only on relevant properties
  const propertyKey = createPropertyKey(objs, RELEVANT_PROPS);

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

  const toCollect = useMemo(() => {
    return collectPropertyValues(objs, [...COLLECTED_PROPS]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyKey]);

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
      if (skipIds.has(obj.id)) {
        return;
      }
      const name = (obj as ExitObj).name;
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
      description="A name of the entrance. Must be unique."
      noTemplate
      values={toCollect.name}
      defaultValue=""
      onValueChange={({ scope, value }: { scope: PropertyValueScope; value: string | undefined }): void => {
        updateProps(scope, {
          name: value,
          status: nameValidator(value) ? "error" : null,
        });
      }}
      debounceMs={100}
      renderInput={(
        key: string,
        value: string | undefined,
        onChange: (value: string) => void,
      ): ReactElement => {
        return (
          <TextInput
            key={key}
            defaultValue={value ?? ""}
            placeholder="Enter name"
            error={nameValidator(value)}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }}
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
      onValueChange={({ scope, value }: { scope: PropertyValueScope; value: string | null | undefined }): void => {
        updateProps(scope, { preferredEntranceId: value });
      }}
      renderInput={(
        key: string,
        value: string | null | undefined,
        onChange: (value: string) => void,
      ): ReactElement => {
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
      onValueChange={({ scope, value }: { scope: PropertyValueScope; value: number | undefined }): void => {
        updateProps(scope, { sensorRadius: value });
      }}
      renderInput={(
        key: string,
        value: number | undefined,
        onChange: (value: number) => void,
      ): ReactElement => {
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
