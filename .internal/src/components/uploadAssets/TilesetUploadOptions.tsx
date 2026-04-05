import { sliceTileset } from "@/editors/tileset/loader";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors } from "@/slices/tilesetEditor";
import { uploadTilesetThunk } from "@/thunks/tileset";
import { Rect } from "@/types/rect";
import { packSprites } from "@/utils/spritepack";
import { Button, Group, Image, Select, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconLibraryPhoto, IconPhotoPlus } from "@tabler/icons-react";
import { useEffect, useMemo } from "react";
import RestrictedControl from "./RestrictedControl";

const NEW_TILESET = "__new_tileset__";
const MERGE_UPLOADS = "__merge_uploads__";

export type SpecialTilesetOption = typeof NEW_TILESET | typeof MERGE_UPLOADS;
export { MERGE_UPLOADS, NEW_TILESET };

interface FormValues {
  creationOption: SpecialTilesetOption | string;
  restricted: boolean;
}

interface TilesetUploadOptionsProps {
  files: File[];
  closeModal: () => void;
}

export default function TilesetUploadOptions({
  files,
  closeModal,
}: TilesetUploadOptionsProps) {
  const dispatch = useAppDispatch();
  const tilesets = useAppSelector(selectors.selectTilesets);

  const form = useForm<FormValues>({
    name: "tileset-upload",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    initialValues: {
      creationOption: NEW_TILESET,
      restricted: false,
    },
  });

  // Reset form and re-run smart default whenever the file set changes
  useEffect(() => {
    form.reset();
    if (files.length > 1) {
      chooseDefaultCreationOption(files).then((defaultOption) => {
        form.setFieldValue("creationOption", defaultOption);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const tilesetOptions = useMemo(() => {
    const groups: Array<{
      group: string;
      items: Array<{ value: string; label: string }>;
    }> = [];

    const ntGroups: { value: string; label: string }[] = [];
    groups.push({ group: "New tilesets", items: ntGroups });

    ntGroups.push({
      value: NEW_TILESET,
      label:
        files.length === 1
          ? "Create a new tileset"
          : "Create a new tileset for each upload",
    });

    if (files.length > 1) {
      ntGroups.push({
        value: MERGE_UPLOADS,
        label: `Merge the ${files.length} uploads into a single new tileset`,
      });
    }

    const existingTilesets = Object.values(tilesets).map((tileset) => ({
      value: tileset.id,
      label: `Merge into ${tileset.id}`,
    }));

    if (existingTilesets.length > 0) {
      groups.push({ group: "Existing tilesets", items: existingTilesets });
    }

    return groups;
  }, [tilesets, files.length]);

  const renderSelectOption = (item: {
    option: { value: string; label: string };
  }) => {
    const { value, label } = item.option;

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

  const handleSubmit = form.onSubmit(async (values) => {
    if (!files.length) return;
    closeModal();

    const { creationOption: copt, restricted } = values;

    if (copt === NEW_TILESET) {
      for (const file of files) {
        dispatch(
          uploadTilesetThunk({
            objectUrl: URL.createObjectURL(file),
            composite: false,
            restricted,
          }),
        );
      }
    } else if (copt === MERGE_UPLOADS) {
      const bitmaps = await Promise.all(
        files.map((file) => createImageBitmap(file)),
      );
      const merged = await packSprites(bitmaps);
      for (const bitmap of bitmaps) bitmap.close();

      const ts = await dispatch(
        uploadTilesetThunk({
          objectUrl: merged.objectUrl,
          composite: true,
          restricted,
        }),
      ).unwrap();

      const coords: Rect[] = merged.sprites;
      await sliceTileset(ts.id, coords);
    }
  });

  return (
    <form onSubmit={handleSubmit}>
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

/**
 * Determine the default creation option based on average image area.
 * Small images (sprites) default to merge; large images default to individual tilesets.
 */
async function chooseDefaultCreationOption(
  files: File[],
): Promise<SpecialTilesetOption> {
  const allowedTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/tiff",
  ]);
  const imageFiles = files.filter((f) => allowedTypes.has(f.type));
  if (imageFiles.length === 0) return NEW_TILESET;

  try {
    const areas = await Promise.all(
      imageFiles.map(async (file) => {
        const bitmap = await createImageBitmap(file);
        const area = bitmap.width * bitmap.height;
        bitmap.close();
        return area;
      }),
    );
    const avg = areas.reduce((s, a) => s + a, 0) / areas.length;
    return avg < 1024 ? MERGE_UPLOADS : NEW_TILESET;
  } catch {
    return NEW_TILESET;
  }
}
