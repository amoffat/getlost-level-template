import * as constants from "@/constants";
import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { ExitObj } from "@/types/map";
import { ExitProps } from "@/types/properties";
import {
  collectPropertyValues,
  updateObjectProperties,
} from "@/utils/propertyEditor";
import {
  Button,
  Fieldset,
  Slider,
  Stack,
  Switch,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ReactNode, useCallback, useMemo } from "react";
import GatewayModal from "../GatewayModal";
import PropertyValue, { PropertyValueLevel } from "../PropertyValue";

export default function ExitProperties({ objs }: { objs: ExitObj[] }) {
  const dispatch = useAppDispatch();
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  // All exit objects use the same global exit template
  const templateUpdate = useCallback(
    (_objs: ExitObj[], props: Partial<ExitProps>) => {
      dispatch(
        mapEditorActions.updateTemplate({
          name: "exitGateways",
          updates: props,
        })
      );
    },
    [dispatch]
  );

  const resolveTemplate = (_obj: ExitObj): ExitProps => {
    const state = store.getState();
    return state.mapEditor.templates.exitGateways;
  };

  const updateProps = useCallback(
    (level: PropertyValueLevel, props: Partial<ExitProps>) => {
      updateObjectProperties<ExitObj, ExitProps>({
        level,
        objs,
        props,
        templateUpdate,
      });
    },
    [objs, templateUpdate]
  );

  const toCollect = useMemo(() => {
    return collectPropertyValues<ExitProps, ExitObj>(objs, resolveTemplate, [
      "name",
      "preferredEntranceId",
      "force",
      "sensorRadius",
    ]);
  }, [objs]);

  const handleModalSubmit = useCallback(
    (gatewayId: string, numericRepoId: string | null) => {
      // Update the entrance id with the format: repoId/entranceId
      const formattedEntranceId = numericRepoId
        ? `${numericRepoId}/${gatewayId}`
        : gatewayId;

      updateProps("instance", { preferredEntranceId: formattedEntranceId });
    },
    [updateProps]
  );

  const nameInput = (
    <PropertyValue
      label="Name"
      description="A name of the entrance. Must be unique."
      noTemplate
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

  const prefEntrance = toCollect.preferredEntranceId[0]?.value ?? "";
  const hasPrefEntrance = prefEntrance.trim() !== "";

  const preferredEntranceInput = (
    <PropertyValue
      label="Preferred entrance"
      description="If an entrance matching this id attaches to this exit, it will be permanently attached."
      noTemplate
      values={toCollect.preferredEntranceId}
      defaultValue=""
      onValueChange={(
        level: PropertyValueLevel,
        value: string | undefined
      ): void => {
        updateProps(level, { preferredEntranceId: value });
      }}
      renderInput={(
        value: string | undefined,
        onChange: (value: string) => void
      ): ReactNode => {
        return (
          <Stack gap="xs" p={0}>
            <TextInput
              value={value ?? ""}
              placeholder="Enter entrance id"
              onChange={(e) => {
                onChange(e.target.value);
              }}
            />

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
    <PropertyValue
      label="Force exit?"
      description="A forced exit does not give the player a choice to stay."
      noTemplate
      values={toCollect.force}
      defaultValue={false}
      onValueChange={(
        level: PropertyValueLevel,
        value: boolean | undefined
      ): void => {
        updateProps(level, { force: value });
      }}
      renderInput={(
        value: boolean | undefined,
        onChange: (value: boolean) => void
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

  const sensorSizeInput = (
    <PropertyValue
      label="Sensor radius"
      description="The radius that triggers the player to exit."
      values={toCollect.sensorRadius}
      defaultValue={constants.defaultExitSensorRadius}
      noTemplate
      debounceMs={null}
      onValueChange={(
        level: PropertyValueLevel,
        value: number | undefined
      ): void => {
        updateProps(level, { sensorRadius: value });
      }}
      renderInput={(
        value: number | undefined,
        onChange: (value: number) => void
      ): ReactNode => {
        return (
          <Slider
            value={value}
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
      <Fieldset legend="Exit properties" mt="md" p="xs">
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
