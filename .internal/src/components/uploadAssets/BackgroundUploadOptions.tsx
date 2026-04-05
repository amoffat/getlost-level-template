import { useAppDispatch } from "@/hooks/redux";
import { uploadBackgroundImageThunk } from "@/thunks/background";
import { Button, Group, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import RestrictedControl from "./RestrictedControl";

interface FormValues {
  restricted: boolean;
}

interface BackgroundUploadOptionsProps {
  files: File[];
  closeModal: () => void;
}

export default function BackgroundUploadOptions({
  files,
  closeModal,
}: BackgroundUploadOptionsProps) {
  const dispatch = useAppDispatch();

  const form = useForm<FormValues>({
    name: "background-upload",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    initialValues: { restricted: false },
  });

  // Reset form whenever the file set changes
  useEffect(() => {
    form.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const handleSubmit = form.onSubmit(({ restricted }) => {
    closeModal();
    dispatch(uploadBackgroundImageThunk({ files, restricted }));
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <Text size="sm" c="dimmed">
          {files.length === 1
            ? `Upload "${files[0].name}" as a background image for the Background layer. Background images are rendered behind all other layers and can be repositioned in the Background tool.`
            : `Upload ${files.length} images as background images. Each file will be added as a separate background image.`}
        </Text>

        <RestrictedControl
          value={form.values.restricted}
          onChange={(v) => form.setFieldValue("restricted", v)}
        />

        <Group mt="lg" justify="flex-end">
          <Button color="blue" type="submit" radius="md">
            Upload
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

