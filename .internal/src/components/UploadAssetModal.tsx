import { overlayProps } from "@/constants";
import { unpackTileset } from "@/editor/tileset/loader";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as uiActions } from "@/slices/ui";
import { uploadTilesetThunk } from "@/thunks/tileset";
import { Rect } from "@/types/rect";
import { packSprites } from "@/utils/spritepack";
import { Button, Group, Image, Modal, Select, Stack } from "@mantine/core";
import { FileWithPath } from "@mantine/dropzone";
import { useForm } from "@mantine/form";
import { IconLibraryPhoto, IconPhotoPlus } from "@tabler/icons-react";
import { useCallback, useMemo } from "react";

interface TileAssetTypeModalProps {
  files: File[];
  opened: boolean;
  closeModal: () => void;
}

interface FormValues {
  creationOption: SpecialTilesetOption | string;
}

type SpecialTilesetOption = "__new_tileset__" | "__merge_uploads__";

export default function UploadAssetModal({
  files,
  opened,
  closeModal,
}: TileAssetTypeModalProps) {
  const dispatch = useAppDispatch();
  const tilesets = useAppSelector((state) => state.tilesetEditor.tilesets);

  const form = useForm<FormValues>({
    name: "tile-asset-type",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    initialValues: {
      creationOption: "__new_tileset__",
    },
  });

  const tilesetOptions = useMemo(() => {
    const groups: Array<{
      group: string;
      items: Array<{ value: string; label: string }>;
    }> = [];

    const nt_groups = [
      {
        value: "__new_tileset__",
        label: "Create a new tileset for each upload",
      },
    ];
    groups.push({
      group: "New tilesets",
      items: nt_groups,
    });

    // Add "Merge with other uploads" option if there are multiple files
    if (files.length > 1) {
      nt_groups.push({
        value: "__merge_uploads__",
        label: `Merge the ${files.length} uploads into a single new tileset`,
      });
    }

    // Add existing tilesets group
    const existingTilesets = Object.values(tilesets).map((tileset) => ({
      value: tileset.id,
      label: `Merge into ${tileset.id}`,
    }));

    if (existingTilesets.length > 0) {
      groups.push({
        group: "Existing tilesets",
        items: existingTilesets,
      });
    }

    return groups;
  }, [tilesets, files.length]);

  const uploadTileset = useCallback(
    async (values: FormValues, files: FileWithPath[]) => {
      if (!files.length) return;

      const copt = values.creationOption;

      if (copt === "__new_tileset__") {
        for (const file of files) {
          const objectUrl = URL.createObjectURL(file);
          dispatch(uploadTilesetThunk(objectUrl));
        }
      } else if (copt === "__merge_uploads__") {
        // Merge all files into a single tileset
        const merged = await packSprites(files);
        const ts = await dispatch(
          uploadTilesetThunk(merged.objectUrl)
        ).unwrap();

        const coords: Rect[] = [];
        await unpackTileset(ts.id, coords);
      }
    },
    [dispatch]
  );

  const formSubmit = form.onSubmit((values) => {
    closeModal();
    uploadTileset(values, files);
    dispatch(uiActions.setTab("tileset-editor"));
  });

  const renderSelectOption = (item: {
    option: { value: string; label: string };
  }) => {
    const { value, label } = item.option;
    // Special case for "Merge with other uploads" option
    if (value === "__merge_uploads__") {
      return (
        <Group gap="xs">
          <IconLibraryPhoto />
          {label}
        </Group>
      );
    } else if (value === "__new_tileset__") {
      return (
        <Group gap="xs">
          <IconPhotoPlus />
          {label}
        </Group>
      );
    }

    const tileset = tilesets[value];

    return (
      <Group gap="sm">
        <Image
          src={tileset.objectUrl}
          w={64}
          h={48}
          fit="cover"
          style={{ flexShrink: 0 }}
        />
        <span>{label}</span>
      </Group>
    );
  };

  return (
    <Modal
      size="lg"
      centered
      opened={opened}
      onClose={() => closeModal()}
      title="Tileset upload"
      overlayProps={overlayProps}
      closeOnClickOutside={false}
    >
      <form onSubmit={formSubmit}>
        <Stack>
          <Select
            label="Asset creation"
            description="How should the uploaded assets be organized into tilesets?"
            placeholder="Choose a tileset"
            data={tilesetOptions}
            key={form.key("creationOption")}
            {...form.getInputProps("creationOption")}
            renderOption={renderSelectOption}
          />

          <Group mt="lg" justify="flex-end">
            <Button color="blue" type="submit" radius="md">
              Submit
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
