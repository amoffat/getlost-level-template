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
import { useCallback, useEffect, useMemo, useRef } from "react";

interface TileAssetTypeModalProps {
  files: File[];
  opened: boolean;
  closeModal: () => void;
}

interface FormValues {
  creationOption: SpecialTilesetOption | string;
}

const NEW_TILESET = "__new_tileset__";
const MERGE_UPLOADS = "__merge_uploads__";

type SpecialTilesetOption = typeof NEW_TILESET | typeof MERGE_UPLOADS;

export default function UploadAssetModal({
  files,
  opened,
  closeModal,
}: TileAssetTypeModalProps) {
  const dispatch = useAppDispatch();
  const tilesets = useAppSelector((state) => state.tilesetEditor.tilesets);
  const hasSetDefault = useRef(false);

  const form = useForm<FormValues>({
    name: "tile-asset-type",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    initialValues: {
      creationOption: NEW_TILESET,
    },
  });

  // Set the default creation option based on image area (only once)
  useEffect(() => {
    if (files.length > 1 && !hasSetDefault.current) {
      hasSetDefault.current = true;
      chooseDefaultCreationOption(files).then((defaultOption) => {
        form.setFieldValue("creationOption", defaultOption);
      });
    }
  }, [files, form]);

  const tilesetOptions = useMemo(() => {
    const groups: Array<{
      group: string;
      items: Array<{ value: string; label: string }>;
    }> = [];

    const ntGroups: { value: string; label: string }[] = [];
    groups.push({
      group: "New tilesets",
      items: ntGroups,
    });

    if (files.length === 1) {
      ntGroups.push({
        value: NEW_TILESET,
        label: "Create a new tileset",
      });
    } else {
      ntGroups.push({
        value: NEW_TILESET,
        label: "Create a new tileset for each upload",
      });
    }

    // Add "Merge with other uploads" option if there are multiple files
    if (files.length > 1) {
      ntGroups.push({
        value: MERGE_UPLOADS,
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

      if (copt === NEW_TILESET) {
        for (const file of files) {
          const objectUrl = URL.createObjectURL(file);
          dispatch(uploadTilesetThunk({ objectUrl, composite: false }));
        }
      } else if (copt === MERGE_UPLOADS) {
        // Convert files to ImageBitmaps
        const bitmaps = await Promise.all(
          files.map((file) => createImageBitmap(file))
        );

        // Merge all files into a single tileset
        const merged = await packSprites(bitmaps);

        // Cleanup bitmaps
        for (const bitmap of bitmaps) {
          bitmap.close();
        }

        const ts = await dispatch(
          uploadTilesetThunk({ objectUrl: merged.objectUrl, composite: true })
        ).unwrap();

        const coords: Rect[] = merged.sprites;
        await unpackTileset(ts.id, coords);
      }
    },
    [dispatch]
  );

  const formSubmit = form.onSubmit((values) => {
    form.reset();
    closeModal();
    uploadTileset(values, files);
    dispatch(uiActions.setTab("tileset-editor"));
  });

  const renderSelectOption = (item: {
    option: { value: string; label: string };
  }) => {
    const { value, label } = item.option;
    // Special case for "Merge with other uploads" option
    if (value === MERGE_UPLOADS) {
      return (
        <Group gap="xs">
          <IconLibraryPhoto />
          {label}
        </Group>
      );
    } else if (value === NEW_TILESET) {
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
      onClose={() => {
        form.reset();
        closeModal();
      }}
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

/**
 * Utility function to determine the default creation option based on image
 * area. Loads image files, calculates their area (width × height), and returns
 * the appropriate default option. Uses createImageBitmap for modern, efficient
 * image decoding.
 *
 * @param files - Array of File objects to analyze
 * @returns Promise resolving to "__merge_uploads__" if average area < 1024,
 * otherwise "__new_tileset__"
 */
async function chooseDefaultCreationOption(
  files: File[]
): Promise<SpecialTilesetOption> {
  // Filter for image files only
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));

  if (imageFiles.length === 0) {
    return NEW_TILESET;
  }

  // Load all images and calculate their areas using createImageBitmap
  const areaPromises = imageFiles.map(async (file) => {
    try {
      const bitmap = await createImageBitmap(file);
      const area = bitmap.width * bitmap.height;
      bitmap.close(); // Clean up the bitmap to free memory
      return area;
    } catch (error) {
      console.error(`Failed to load image: ${file.name}`, error);
      throw error;
    }
  });

  try {
    const areas = await Promise.all(areaPromises);
    const averageArea =
      areas.reduce((sum, area) => sum + area, 0) / areas.length;

    return averageArea < 1024 ? MERGE_UPLOADS : NEW_TILESET;
  } catch (error) {
    console.error("Error calculating image areas:", error);
    return NEW_TILESET;
  }
}
