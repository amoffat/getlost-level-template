import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";

interface LocaleContextModalProps {
  opened: boolean;
  onClose: () => void;
  /** The original (source-language) text shown read-only for reference. */
  originalText: string | undefined;
  /** Current ctx value pre-populated into the textarea. */
  initialCtx: string | undefined;
  /** Called with the new ctx string on Save. */
  onSave: (ctx: string | undefined | null) => void;
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
  const { t } = useTranslation();
  const form = useForm({
    name: "context-modal",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    validateInputOnChange: false,
    initialValues: {
      text: originalText,
      context: initialCtx,
    },
  });

  const handleModalSubmit = form.onSubmit((values) => {
    const ctx = values.context?.trim() === "" ? null : values.context;
    onSave(ctx);
    onClose();
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("localeContextTitle")}
      size="lg"
      centered
    >
      <form onSubmit={handleModalSubmit}>
        <Stack>
          <Text size="sm" c="dimmed">
            {t("localeContextDescription")}
          </Text>

          <Textarea
            label={t("localeContextOriginalText")}
            autosize
            readOnly
            styles={{ input: { cursor: "default" } }}
            key={form.key("text")}
            {...form.getInputProps("text")}
          />

          <Textarea
            label={t("localeContextContext")}
            placeholder={t("localeContextPlaceholder")}
            autosize
            minRows={4}
            key={form.key("context")}
            {...form.getInputProps("context")}
          />

          <Group justify="flex-end">
            <Button type="submit">{t("localeContextSave")}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
