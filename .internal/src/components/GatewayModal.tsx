import { overlayProps } from "@/constants";
import { extractRepoId } from "@/utils/github";
import { loadLevel } from "@/utils/glApi/client";
import { Button, Loader, Modal, Select, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedCallback } from "@mantine/hooks";
import { useCallback, useState } from "react";

interface GatewayModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (gatewayId: string, numericRepoId: string | null) => void;
  gatewayLabel: string;
  gatewayPlaceholder: string;
  gatewayDescription: string;
  filterGateway?: (repoId: string, gatewayId: string) => boolean;
}

export default function GatewayModal({
  opened,
  onClose,
  onSubmit,
  gatewayLabel,
  gatewayPlaceholder,
  gatewayDescription,
  filterGateway,
}: GatewayModalProps) {
  const [availableGateways, setAvailableGateways] = useState<string[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(false);
  const [numericRepoId, setNumericRepoId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const form = useForm({
    name: "github-gateway-lookup",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    validateInputOnChange: false,
    initialValues: {
      githubRepoId: "",
      gatewayId: "",
    },
    validate: {
      githubRepoId: (value) => {
        if (!value.trim()) {
          return "Level ID is required";
        }
        // Use the validation error state from debounced validation
        return validationError;
      },
      gatewayId: (value) => (!value ? "Gateway selection is required" : null),
    },
  });

  // Debounced validation function
  const debouncedValidation = useDebouncedCallback(async (repoId: string) => {
    if (!repoId.trim()) {
      setValidationError(null);
      return;
    }

    const numericId = await extractRepoId(repoId);
    if (!numericId) {
      setValidationError(
        "Must be in format: owner/repo, numeric ID, GitHub URL, or Get Lost URL"
      );
    } else {
      setValidationError(null);
    }
  }, 500);

  // Debounced function to lookup gateways
  const debouncedLookupGateways = useDebouncedCallback(
    async (repoId: string) => {
      if (repoId.trim()) {
        try {
          // Extract numeric repo ID from any format
          const numericRepoId = await extractRepoId(repoId);

          if (!numericRepoId) {
            setAvailableGateways([]);
            setNumericRepoId(null);
            setLoadingGateways(false);
            return;
          }

          // Use the numeric ID to lookup gateways
          const level = await loadLevel(numericRepoId);
          setAvailableGateways(level.exits);
          setNumericRepoId(numericRepoId);
          if (level.exits.length === 0) {
            setValidationError("No gateways found in this level");
          }
        } catch {
          setAvailableGateways([]);
          setValidationError("No gateways found in this level");
        } finally {
          setLoadingGateways(false);
        }
      } else {
        setAvailableGateways([]);
        setLoadingGateways(false);
      }
    },
    1000
  );

  const resetAndCloseModal = useCallback(() => {
    form.reset();
    setAvailableGateways([]);
    setNumericRepoId(null);
    setValidationError(null);
    onClose();
  }, [form, onClose]);

  const handleModalSubmit = form.onSubmit((values) => {
    onSubmit(values.gatewayId, numericRepoId);
    resetAndCloseModal();
  });

  return (
    <Modal
      opened={opened}
      onClose={resetAndCloseModal}
      title="Gateway lookup"
      overlayProps={overlayProps}
      centered
    >
      <form onSubmit={handleModalSubmit}>
        <Stack gap="md">
          <TextInput
            label="Level id"
            placeholder="Level id"
            description="Can be the Github level url, owner/repo, repo id (numeric), or Get Lost level url"
            key={form.key("githubRepoId")}
            {...form.getInputProps("githubRepoId")}
            error={validationError}
            onChange={(e) => {
              const input = e.target.value;
              form.getInputProps("githubRepoId").onChange(e);

              // Clear validation error immediately on change
              setValidationError(null);

              // Trigger debounced validation
              debouncedValidation(input);

              // Trigger debounced lookup
              if (input.trim()) {
                setLoadingGateways(true);
              }
              debouncedLookupGateways(input);
            }}
          />

          <Select
            label={gatewayLabel}
            placeholder={gatewayPlaceholder}
            data={
              filterGateway && numericRepoId
                ? availableGateways.filter((gatewayId) =>
                    filterGateway(numericRepoId, gatewayId)
                  )
                : availableGateways
            }
            disabled={availableGateways.length === 0 || loadingGateways}
            description={
              availableGateways.length === 0
                ? gatewayDescription
                : "Select a gateway from the level"
            }
            rightSection={loadingGateways ? <Loader size="xs" /> : undefined}
            key={form.key("gatewayId")}
            {...form.getInputProps("gatewayId")}
          />

          <Button type="submit" fullWidth>
            Select gateway
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
