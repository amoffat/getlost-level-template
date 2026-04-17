import { entryTemplateId } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  actions as mapEditorActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import { EntranceObj } from "@/types/map";
import { EntranceProps } from "@/types/properties";
import {
  collectPropertyValues,
  updateObjectProperties,
} from "@/utils/propertyEditor";
import { createPropertyKey, createPropsEqualFn } from "@/utils/propertyKey";
import {
  Button,
  CloseButton,
  Fieldset,
  Group,
  Stack,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { memo, ReactElement, useCallback, useMemo } from "react";
import GatewayModal from "../GatewayModal";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";
import { requiredUniqueName } from "./validators/name";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = ["name", "exitIds"] as const;

// Additional properties needed for identification
const TEMPLATE_PROPS = ["id"] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function EntranceProperties({ objs }: { objs: EntranceObj[] }) {
  const dispatch = useAppDispatch();
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const objsByTemplateId = useAppSelector((state) =>
    mapSelectors.objectsByTemplateId(state, entryTemplateId),
  );

  // Create a key based only on relevant properties
  const propertyKey = createPropertyKey(objs, RELEVANT_PROPS);

  // All entrance objects use the same global entrance template
  const templateUpdate = useCallback(
    (_objs: EntranceObj[], props: Partial<EntranceProps>) => {
      dispatch(
        mapEditorActions.updateTemplate({
          name: "entryGateways",
          updates: props,
        }),
      );
    },
    [dispatch],
  );

  const updateProps = useCallback(
    (scope: PropertyValueScope, props: Partial<EntranceProps>) => {
      updateObjectProperties({
        scope: scope,
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
      // Update the exit id with the format: repoId/exitId
      const formattedExitId = numericRepoId
        ? `${numericRepoId}/${gatewayId}`
        : gatewayId;

      // Add the new exit ID to the array
      const currentExitIds = toCollect.exitIds[0]?.value ?? [];
      const newExitIds = [...currentExitIds, formattedExitId];
      updateProps("instance", { exitIds: newExitIds });
    },
    [toCollect.exitIds, updateProps],
  );

  const filterGateway = useCallback(
    (repoId: string, gatewayId: string) => {
      const currentExitIds = toCollect.exitIds[0]?.value ?? [];
      const formattedExitId = `${repoId}/${gatewayId}`;
      // Return true to include, false to filter out
      return !currentExitIds.includes(formattedExitId);
    },
    [toCollect.exitIds],
  );

  const existingNames = useMemo(() => {
    const names = new Set<string>();
    const skipIds = new Set(objs.map((obj) => obj.id));
    objsByTemplateId.forEach((obj) => {
      if (skipIds.has(obj.id)) {
        return;
      }
      const name = (obj as EntranceObj).name;
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

  const numExits = toCollect.exitIds[0]?.value.length ?? 0;

  const exitIdInput = (
    <Stack p={0} gap="xs">
      <PropertyValue
        label="Exit connections"
        description="The IDs of the exits (up to 3) that will lead to this entrance."
        noTemplate
        values={toCollect.exitIds}
        onValueChange={({ scope, value }: { scope: PropertyValueScope; value: string[] | undefined }): void => {
          updateProps(scope, { exitIds: value });
        }}
        renderInput={(
          key: string,
          value: string[] | undefined,
          onChange: (value: string[]) => void,
        ): ReactElement => {
          const exitIds = value ?? [];

          return (
            <Stack key={key} gap="xs" p={0}>
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
      <Fieldset legend="Entrance properties" p="xs">
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

export default memo(
  EntranceProperties,
  createPropsEqualFn<EntranceObj>(RELEVANT_PROPS),
);
