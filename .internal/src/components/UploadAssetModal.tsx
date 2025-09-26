import {
  Button,
  Group,
  Modal,
  Portal,
  Radio,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import RadioCard from "./assetTypes/RadioCard";

interface CardEntry {
  value: string;
  label: string;
  description: string;
}

interface TileAssetTypeModalProps {
  files: File[];
  opened: boolean;
  closeModal: () => void;
}

function deriveEntries(files: File[]): CardEntry[] {
  return [];
}

const multipleEntries1: CardEntry[] = [
  {
    value: "tilesets",
    label: "Individual tilesets",
    description: "Each image is a separate tileset of objects.",
  },
  {
    value: "tileset-composite",
    label: "Composite tileset",
    description: "Each image is a separate object.",
  },
];

const singleEntries1: CardEntry[] = [
  {
    value: "tileset",
    label: "Single tileset",
    description: "The image is a single tileset of objects.",
  },
  {
    value: "object",
    label: "Single object",
    description: "The image is a single object.",
  },
];

const multipleEntries2: CardEntry[] = [
  {
    value: "tilesets",
    label: "Individual tilesets",
    description: "Each image is a separate tileset of objects.",
  },
  {
    value: "tileset-composite",
    label: "Composite tileset",
    description: "Each image is a separate object.",
  },
  {
    value: "npc-frames",
    label: "NPC animation frames",
    description: "Each image is a separate frame for an NPC animation.",
  },
];

const singleEntries2: CardEntry[] = [
  {
    value: "tileset",
    label: "Single tileset",
    description: "The image is a single tileset of objects.",
  },
  {
    value: "npc-spritesheet",
    label: "NPC spritesheet",
    description:
      "The image is a spritesheet containing frames for an NPC's animations.",
  },
];

export default function UploadAssetModal({
  files,
  opened,
  closeModal,
}: TileAssetTypeModalProps) {
  const entries = deriveEntries(files);

  // Helper to derive initial values from current entries. Extend this if more fields are added.
  const deriveInitialValues = (list: CardEntry[]) => ({
    assetType: list[0].value,
  });

  const form = useForm({
    name: "tile-asset-type",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    initialValues: deriveInitialValues(entries),
  });

  // Whenever numFiles (and thus which entries array we use) changes, reset all
  // fields to the newly derived initial values so the form stays in sync.
  useEffect(() => {
    const nextInitial = deriveInitialValues(entries);
    form.setInitialValues(nextInitial);
    form.setValues(nextInitial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  // Build our radio selection cards
  const cards = entries.map(({ value, label, description }) => (
    <RadioCard
      key={value}
      value={value}
      label={label}
      description={description}
    />
  ));

  const formSubmit = form.onSubmit((values) => {
    closeModal();
  });

  return (
    <Portal>
      <Modal
        centered
        opened={opened}
        onClose={() => closeModal()}
        title="Asset upload"
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
      >
        <form onSubmit={formSubmit}>
          <Stack>
            <Text>What type of assets are you uploading?</Text>
            <Radio.Group
              {...form.getInputProps("assetType")}
              key={form.key("assetType")}
            >
              <Stack>{cards}</Stack>
            </Radio.Group>

            <Group mt="lg" justify="flex-end">
              <Button color="blue" type="submit" radius="md">
                Submit
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Portal>
  );
}
