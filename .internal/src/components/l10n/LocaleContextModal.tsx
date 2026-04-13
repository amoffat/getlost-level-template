import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";

interface LocaleContextModalProps {
  opened: boolean;
  onClose: () => void;
  /** The original (source-language) text shown read-only for reference. */
  originalText: string | null;
  /** Current ctx value pre-populated into the textarea. */
  initialCtx: string | undefined;
  /** Called with the new ctx string (or undefined if cleared) on Save. */
  onSave: (ctx: string | undefined) => void;
}

/**
 * Modal for editing the translator context (`ctx`) field of a locale entry.
 *
 * Context is a free-form note that helps translators understand how a string
 * is used (e.g. "Button label", "NPC name shown in speech bubble").
 */
export default function LocaleContextModal({
  opened,
  onClose,
  originalText,
  initialCtx,
  onSave,
}: LocaleContextModalProps) {
  const form = useForm({
    name: "context-modal",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    validateInputOnChange: false,
    initialValues: {
      context: "",
    },
  });

  const handleModalSubmit = form.onSubmit((values) => {
    onSave(values.context || undefined);
    onClose();
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Translation Context"
      size="lg"
      centered
    >
      <form onSubmit={handleModalSubmit}>
        <Stack>
          <Text size="sm" c="dimmed">
            The translation context is not shown in-game and is only used to
            assist the translators in understanding the meaning of the text they
            are tasked with translating.
          </Text>

          <Textarea
            label="Original text"
            value={originalText ?? ""}
            autosize
            readOnly
            styles={{ input: { cursor: "default" } }}
          />

          <Textarea
            label="Context"
            placeholder="e.g. A friendly greeting from the character"
            autosize
            minRows={4}
            defaultValue={initialCtx ?? ""}
            key={form.key("context")}
            {...form.getInputProps("context")}
          />

          <Group justify="flex-end">
            <Button type="submit">Save</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
