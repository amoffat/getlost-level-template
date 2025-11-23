import { overlayProps } from "@/constants";
import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { ExitObj } from "@/types/map";
import { ExitProps } from "@/types/properties";
import { extractIdFromGithubRepoUrl, extractOwnerRepo } from "@/utils/github";
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
  Switch,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import memoize from "memoizee";
import { ReactNode, useCallback, useMemo, useState } from "react";
import PropertyValue, { PropertyValueLevel } from "../PropertyValue";

// Stub function to lookup exits from a Github repository
// TODO: Replace with actual network call
async function lookupExitsFromRepo(repoId: string): Promise<string[]> {
  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Return mock data for now
  return [`exit-${repoId}-1`, `exit-${repoId}-2`, `exit-${repoId}-3`];
}

// So we don't spam github
const cachedLookupIdFromGithubRepoUrl = memoize(extractIdFromGithubRepoUrl, {
  promise: true,
});

export default function ExitProperties({ objs }: { objs: ExitObj[] }) {
  const dispatch = useAppDispatch();
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [availableExits, setAvailableExits] = useState<string[]>([]);
  const [loadingExits, setLoadingExits] = useState(false);
  const [numericRepoId, setNumericRepoId] = useState<string | null>(null);

  const form = useForm({
    name: "github-exit-lookup",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    validateInputOnChange: true,
    initialValues: {
      githubRepoId: "",
      exitId: "",
    },
    validate: {
      githubRepoId: (value) => {
        if (!value.trim()) {
          return "Github repository ID is required";
        }
        const ownerRepo = extractOwnerRepo(value);
        if (!ownerRepo) {
          return "Must be in format: owner/repo or a valid GitHub URL";
        }
        return null;
      },
      exitId: (value) => (!value ? "Exit selection is required" : null),
    },
  });

  // Debounced function to lookup exits
  const debouncedLookupExits = useDebouncedCallback(async (repoId: string) => {
    if (repoId.trim()) {
      try {
        // Extract owner/repo format
        const ownerRepo = extractOwnerRepo(repoId);
        if (!ownerRepo) {
          setAvailableExits([]);
          setLoadingExits(false);
          return;
        }

        // Get the numeric GitHub repo ID
        const numericRepoId = await cachedLookupIdFromGithubRepoUrl(
          `https://github.com/${ownerRepo}`
        );

        if (!numericRepoId) {
          setAvailableExits([]);
          setNumericRepoId(null);
          setLoadingExits(false);
          return;
        }

        // Use the numeric ID to lookup exits
        const exits = await lookupExitsFromRepo(numericRepoId);
        setAvailableExits(exits);
        setNumericRepoId(numericRepoId);
      } catch {
        setAvailableExits([]);
      } finally {
        setLoadingExits(false);
      }
    } else {
      setAvailableExits([]);
      setLoadingExits(false);
    }
  }, 1000);

  // All exit objects use the same global exit template
  const updateTemplate = useCallback(
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

  const updateProps = useCallback(
    (level: PropertyValueLevel, props: Partial<ExitProps>) => {
      updateObjectProperties<ExitProps, ExitObj>(
        level,
        objs,
        props,
        updateTemplate
      );
    },
    [objs, updateTemplate]
  );

  const resetAndCloseModal = useCallback(() => {
    form.reset();
    setAvailableExits([]);
    setNumericRepoId(null);
    closeModal();
  }, [form, closeModal]);

  const handleModalSubmit = form.onSubmit((values) => {
    // Update the exit id with the format: repoId/exitId
    const formattedExitId = numericRepoId
      ? `${numericRepoId}/${values.exitId}`
      : values.exitId;

    updateProps("instance", { preferredEntranceId: formattedExitId });
    resetAndCloseModal();
  });

  const resolveTemplate = (_obj: ExitObj): ExitProps => {
    const state = store.getState();
    return state.mapEditor.templates.exitGateways;
  };

  const toCollect = useMemo(() => {
    return collectPropertyValues<ExitProps, ExitObj>(objs, resolveTemplate, [
      "name",
      "preferredEntranceId",
      "force",
    ]);
  }, [objs]);

  const nameInput = (
    <PropertyValue
      label="Name"
      description="A name of the entrance. Must be unique."
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

  const preferredEntranceInput = (
    <PropertyValue
      label="Preferred entrance"
      description="If an entrance matching this id attaches to this exit, it will be permanently attached."
      noTemplate
      values={toCollect.preferredEntranceId}
      onValueChange={(
        level: PropertyValueLevel,
        value: string | null | undefined
      ): void => {
        updateProps(level, { preferredEntranceId: value });
      }}
      renderInput={(
        value: string | null,
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
            <Button size="xs" fullWidth onClick={openModal}>
              Add connection
            </Button>
          </Stack>
        );
      }}
    />
  );

  const forceInput = (
    <PropertyValue
      label="Force exit?"
      description="If an exit is forced, players do not get a choice to exit."
      noTemplate
      values={toCollect.force}
      onValueChange={(
        level: PropertyValueLevel,
        value: boolean | undefined
      ): void => {
        updateProps(level, { force: value });
      }}
      renderInput={(
        value: boolean | null,
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

  const singleSelected = objs.length === 1;

  return (
    <>
      <Fieldset legend="Exit properties" mt="md" p="xs">
        <Stack p={0} gap="xl">
          {singleSelected && nameInput}
          {forceInput}
          {singleSelected && preferredEntranceInput}
        </Stack>
      </Fieldset>

      <Modal
        opened={modalOpened}
        onClose={resetAndCloseModal}
        title="Exit lookup"
        overlayProps={overlayProps}
        centered
      >
        <form onSubmit={handleModalSubmit}>
          <Stack gap="md">
            <TextInput
              label="Github repository"
              placeholder="owner/repo or https://github.com/owner/repo"
              description="Enter the Github repository as owner/repo or a full GitHub URL"
              key={form.key("githubRepoId")}
              {...form.getInputProps("githubRepoId")}
              onChange={(e) => {
                const input = e.target.value;
                const ownerRepo = extractOwnerRepo(input);
                // Always set the extracted owner/repo format (or the original input if invalid)
                const displayValue = ownerRepo || input;
                e.target.value = displayValue;
                form.getInputProps("githubRepoId").onChange(e);

                // Trigger debounced lookup
                if (displayValue.trim()) {
                  setLoadingExits(true);
                }
                debouncedLookupExits(displayValue);
              }}
            />

            <Select
              label="Exit name"
              placeholder="Select an exit"
              data={availableExits}
              disabled={availableExits.length === 0 || loadingExits}
              description={
                availableExits.length === 0
                  ? "Enter a Github repository ID first"
                  : "Select an exit from the repository"
              }
              rightSection={loadingExits ? <Loader size="xs" /> : undefined}
              key={form.key("exitId")}
              {...form.getInputProps("exitId")}
            />

            <Button type="submit" fullWidth>
              Select exit
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
