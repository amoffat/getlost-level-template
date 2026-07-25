import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";

interface AddEntryModalProps {
  opened: boolean;
  onClose: () => void;
  /**
   * Called with the new entry's source text and optional translator context.
   * `context` is `undefined` when the field was left blank.
   */
  onSubmit: (text: string, context: string | undefined) => void;
}

/**
 * Modal for authoring a standalone (pinned) translation key on the main locale.
 *
 * Unlike keys minted from game objects, an entry created here is not attached to
 * any object, so it is pinned to survive autosave pruning until manually
 * deleted. It collects the source `text` (required) and an optional translator
 * `context` note.
 */
export default function AddEntryModal({
  opened,
  onClose,
  onSubmit,
}: AddEntryModalProps) {
  const { t } = useTranslation();
  const form = useForm({
    name: "add-entry-modal",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    validateInputOnChange: false,
    initialValues: {
      text: "",
      context: "",
    },
    validate: {
      text: isNotEmpty(t("translationsAddEntryTextRequired")),
    },
  });

  const resetAndClose = () => {
    form.reset();
    onClose();
  };

  const handleModalSubmit = form.onSubmit((values) => {
    const text = values.text.trim();
    const context = values.context.trim() === "" ? undefined : values.context;
    onSubmit(text, context);
    resetAndClose();
  });

  return (
    <Modal
      opened={opened}
      onClose={resetAndClose}
      title={t("translationsAddEntryTitle")}
      size="lg"
      centered
    >
      <form onSubmit={handleModalSubmit}>
        <Stack>
          <Text size="sm" c="dimmed">
            {t("translationsAddEntryDescription")}
          </Text>

          <Textarea
            label={t("translationsAddEntryTextLabel")}
            placeholder={t("translationsAddEntryTextPlaceholder")}
            autosize
            minRows={2}
            withAsterisk
            data-autofocus
            key={form.key("text")}
            {...form.getInputProps("text")}
          />

          <Textarea
            label={t("translationsAddEntryContextLabel")}
            placeholder={t("translationsAddEntryContextPlaceholder")}
            autosize
            minRows={2}
            key={form.key("context")}
            {...form.getInputProps("context")}
          />

          <Group justify="flex-end">
            <Button type="submit">{t("translationsAddEntrySubmit")}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
