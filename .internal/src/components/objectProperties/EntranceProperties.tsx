import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { EntranceObj } from "@/types/map";
import { EntranceProps } from "@/types/properties";
import {
  collectPropertyValues,
  updateObjectProperties,
} from "@/utils/propertyEditor";
import {
  Button,
  CloseButton,
  Fieldset,
  Group,
  Stack,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ReactNode, useCallback, useMemo } from "react";
import GatewayModal from "../GatewayModal";
import PropertyValue, { PropertyValueLevel } from "../PropertyValue";
import { nonEmptyName } from "./validators/name";

export default function EntranceProperties({ objs }: { objs: EntranceObj[] }) {
  const dispatch = useAppDispatch();
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  // All entrance objects use the same global entrance template
  const templateUpdate = useCallback(
    (_objs: EntranceObj[], props: Partial<EntranceProps>) => {
      dispatch(
        mapEditorActions.updateTemplate({
          name: "entryGateways",
          updates: props,
        })
      );
    },
    [dispatch]
  );

  const updateProps = useCallback(
    (level: PropertyValueLevel, props: Partial<EntranceProps>) => {
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
    return collectPropertyValues(objs, ["name", "exitIds"]);
  }, [objs]);

  const handleModalSubmit = useCallback(
    (gatewayId: string, numericRepoId: string | null) => {
      // Update the exit id with the format: repoId/exitId
      const formattedExitId = numericRepoId
        ? `${numericRepoId}/${gatewayId}`
        : gatewayId;

      // Add the new exit ID to the array
      const currentExitIds = toCollect.exitIds[0]?.value ?? [];
      const newExitIds = [...currentExitIds, formattedExitId];
      updateProps("instance", { exitIds: newExitIds });
    },
    [toCollect.exitIds, updateProps]
  );

  const filterGateway = useCallback(
    (repoId: string, gatewayId: string) => {
      const currentExitIds = toCollect.exitIds[0]?.value ?? [];
      const formattedExitId = `${repoId}/${gatewayId}`;
      // Return true to include, false to filter out
      return !currentExitIds.includes(formattedExitId);
    },
    [toCollect.exitIds]
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
        updateProps(level, {
          name: value,
          status: nonEmptyName(value) ? "error" : null,
        });
      }}
      renderInput={(
        value: string | undefined,
        onChange: (value: string) => void
      ): ReactNode => {
        return (
          <TextInput
            value={value ?? ""}
            placeholder="Enter name"
            error={nonEmptyName(value)}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }}
    />
  );

  const numExits = toCollect.exitIds[0]?.value.length ?? 0;

  const exitIdInput = (
    <Stack p={0} gap="xs">
      <PropertyValue
        label="Exit connections"
        description="The IDs of the exits (up to 3) that will lead to this entrance."
        noTemplate
        values={toCollect.exitIds}
        onValueChange={(
          level: PropertyValueLevel,
          value: string[] | undefined
        ): void => {
          updateProps(level, { exitIds: value });
        }}
        renderInput={(
          value: string[] | undefined,
          onChange: (value: string[]) => void
        ): ReactNode => {
          const exitIds = value ?? [];

          return (
            <Stack gap="xs" p={0}>
              {exitIds.map((exitId, index) => (
                <Group key={index} gap="xs" wrap="nowrap">
                  <TextInput
                    flex={1}
                    value={exitId}
                    placeholder="Enter exit id"
                    onChange={(e) => {
                      const newExitIds = [...exitIds];
                      newExitIds[index] = e.target.value;
                      onChange(newExitIds);
                    }}
                  />
                  <CloseButton
                    size="xs"
                    onClick={() => {
                      const newExitIds = exitIds.filter((_, i) => i !== index);
                      onChange(newExitIds);
                    }}
                  />
                </Group>
              ))}
            </Stack>
          );
        }}
      />
      {numExits < 3 && (
        <Button size="xs" fullWidth onClick={openModal}>
          Add connection
        </Button>
      )}
    </Stack>
  );

  const singleSelected = objs.length === 1;

  return (
    <>
      <Fieldset legend="Entrance properties" mt="md" p="xs">
        <Stack p={0} gap="xl">
          {singleSelected && nameInput}
          {singleSelected && exitIdInput}
        </Stack>
      </Fieldset>

      <GatewayModal
        opened={modalOpened}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        gatewayLabel="Exit name"
        gatewayPlaceholder="Select an exit"
        gatewayDescription="Enter a Github repository ID first"
        filterGateway={filterGateway}
      />
    </>
  );
}
