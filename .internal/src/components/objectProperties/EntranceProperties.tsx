import { overlayProps } from "@/constants";
import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { EntranceObj } from "@/types/map";
import { EntranceProps } from "@/types/properties";
import {
  collectPropertyValues,
  updateObjectProperties,
} from "@/utils/propertyEditor";
import {
  Button,
  Fieldset,
  Loader,
  Modal,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import PropertyValue, { PropertyValueLevel } from "../PropertyValue";

// Stub function to lookup exits from a Github repository
// TODO: Replace with actual network call
async function lookupExitsFromRepo(repoId: string): Promise<string[]> {
  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Return mock data for now
  return [`exit-${repoId}-1`, `exit-${repoId}-2`, `exit-${repoId}-3`];
}

export default function EntranceProperties({ objs }: { objs: EntranceObj[] }) {
  const dispatch = useAppDispatch();
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [availableExits, setAvailableExits] = useState<string[]>([]);
  const [loadingExits, setLoadingExits] = useState(false);

  const form = useForm({
    name: "github-exit-lookup",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    initialValues: {
      githubRepoId: "",
      exitId: "",
    },
    validate: {
      githubRepoId: (value) => {
        if (!value.trim()) {
          return "Github repository ID is required";
        }
        if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(value)) {
          return "Must be in format: owner/repo";
        }
        return null;
      },
      exitId: (value) => (!value ? "Exit selection is required" : null),
    },
  });

  const [debouncedRepoId] = useDebouncedValue(form.values.githubRepoId, 500);

  // Show loading when the repo ID is being typed (debouncing) or when fetching
  const isTyping = form.values.githubRepoId.trim() !== debouncedRepoId.trim();
  const showLoading =
    loadingExits || (isTyping && form.values.githubRepoId.trim() !== "");

  // Lookup exits when debounced Github repo ID changes
  useEffect(() => {
    if (debouncedRepoId.trim()) {
      setLoadingExits(true);
      lookupExitsFromRepo(debouncedRepoId)
        .then((exits) => {
          setAvailableExits(exits);
          form.setFieldValue("exitId", ""); // Reset selection when exits change
        })
        .finally(() => {
          setLoadingExits(false);
        });
    } else {
      setAvailableExits([]);
      form.setFieldValue("exitId", "");
      setLoadingExits(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedRepoId]);

  // All entrance objects use the same global entrance template
  const updateTemplate = useCallback(
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
    (level: PropertyValueLevel, props: Partial<Omit<EntranceObj, "type">>) => {
      updateObjectProperties<EntranceProps, EntranceObj>(
        level,
        objs,
        props,
        updateTemplate
      );
    },
    [objs, updateTemplate]
  );

  const handleModalSubmit = form.onSubmit((values) => {
    // Update the exit id with the selected value
    updateProps("instance", { exitId: values.exitId });

    // Reset modal state and close
    form.reset();
    setAvailableExits([]);
    closeModal();
  });

  const resolveTemplate = (_obj: EntranceObj): EntranceProps => {
    const state = store.getState();
    return state.mapEditor.templates.entryGateways;
  };

  const toCollect = useMemo(() => {
    return collectPropertyValues<EntranceProps, EntranceObj>(
      objs,
      resolveTemplate,
      ["name", "exitId"]
    );
  }, [objs]);

  const nameInput = (
    <PropertyValue
      label="Name"
      description="A name for the light. Does not have to be unique."
      noTemplate
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
            value={value ?? ""}
            placeholder="Enter name"
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }}
    />
  );

  const exitIdInput = (
    <Stack p={0} gap="xs">
      <PropertyValue
        label="Exit id"
        description="The ID of the exit this entrance is connected to."
        noTemplate
        values={toCollect.exitId}
        onValueChange={(
          level: PropertyValueLevel,
          value: string | undefined
        ): void => {
          updateProps(level, { exitId: value });
        }}
        renderInput={(
          value: string | null,
          onChange: (value: string) => void
        ): ReactNode => {
          return (
            <TextInput
              value={value ?? ""}
              placeholder="Enter exit id"
              onChange={(e) => onChange(e.target.value)}
            />
          );
        }}
      />
      <Button size="xs" fullWidth onClick={openModal}>
        Search for exit
      </Button>
    </Stack>
  );

  const singleSelected = objs.length === 1;

  return (
    <>
      <Fieldset legend="Entrance properties" mt="md" p="xs">
        <Stack p={0} gap="xl">
          {nameInput}
          {singleSelected && exitIdInput}
        </Stack>
      </Fieldset>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title="Exit lookup"
        overlayProps={overlayProps}
        centered
      >
        <form onSubmit={handleModalSubmit}>
          <Stack gap="md">
            <TextInput
              label="Github Repository ID"
              placeholder="owner/repo"
              description="Enter the Github repository in format: owner/repo"
              {...form.getInputProps("githubRepoId")}
            />

            <Select
              label="Exit"
              placeholder="Select an exit"
              data={availableExits}
              disabled={!form.values.githubRepoId.trim() || showLoading}
              description={
                !form.values.githubRepoId.trim()
                  ? "Enter a Github repository ID first"
                  : "Select an exit from the repository"
              }
              rightSection={showLoading ? <Loader size="xs" /> : undefined}
              {...form.getInputProps("exitId")}
            />

            <Button type="submit" fullWidth>
              Set Exit
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
