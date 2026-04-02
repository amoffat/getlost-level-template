import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors } from "@/slices/mapEditor";
import { Card } from "@/types/card";
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect } from "react";

interface PersonFormValues {
  name: string;
  role: string;
  link: string;
}

interface CardFormValues {
  levelName: string;
  credits: PersonFormValues[];
}

interface CardModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function CardModal({ opened, onClose }: CardModalProps) {
  const dispatch = useAppDispatch();
  const card = useAppSelector(selectors.selectCard);

  const form = useForm<CardFormValues>({
    initialValues: {
      levelName: "",
      credits: [],
    },
    validate: {
      levelName: (value) =>
        value.trim().length > 0 ? null : "Level name is required",
      credits: {
        name: (value) => (value.trim().length > 0 ? null : "Name is required"),
        role: (value) => (value.trim().length > 0 ? null : "Role is required"),
        link: (value) => {
          if (!value || value.trim() === "") return null;
          try {
            new URL(value);
            return null;
          } catch {
            return "Please enter a valid URL (e.g. https://example.com)";
          }
        },
      },
    },
  });

  // Populate form with existing card data whenever the modal opens
  useEffect(() => {
    if (opened) {
      form.setValues({
        levelName: card?.level.name ?? "",
        credits:
          card?.credits.map((p) => ({
            name: p.name,
            role: p.role,
            link: p.link ?? "",
          })) ?? [],
      });
      form.resetDirty();
    }
    // form is stable across renders — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, card]);

  const handleSave = () => {
    if (!form.validate().hasErrors) {
      const cardData: Card = {
        level: {
          name: form.values.levelName.trim(),
          version: card?.level.version ?? 1,
        },
        credits: form.values.credits.map((p) => ({
          name: p.name.trim(),
          role: p.role.trim(),
          link: p.link.trim() || null,
        })),
      };
      dispatch(actions.setCard(cardData));
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Level Credits"
      size="xl"
      centered
      closeOnClickOutside={false}
    >
      <Stack>
        <TextInput
          label="Level name"
          required
          {...form.getInputProps("levelName")}
        />

        <Divider label="Credits" labelPosition="left" />

        {form.values.credits.map((_, index) => (
          <Group key={index} align="flex-end" wrap="nowrap" gap="xs">
            <TextInput
              label="Name"
              required
              style={{ flex: 1 }}
              {...form.getInputProps(`credits.${index}.name`)}
            />
            <TextInput
              label="Role"
              required
              style={{ flex: 1 }}
              {...form.getInputProps(`credits.${index}.role`)}
            />
            <TextInput
              label="Social link"
              placeholder="https://..."
              style={{ flex: 1 }}
              {...form.getInputProps(`credits.${index}.link`)}
            />
            <ActionIcon
              color="red"
              variant="subtle"
              size="input-sm"
              onClick={() => form.removeListItem("credits", index)}
              aria-label="Remove person"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}

        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={() =>
            form.insertListItem("credits", { name: "", role: "", link: "" })
          }
        >
          Add person
        </Button>

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
