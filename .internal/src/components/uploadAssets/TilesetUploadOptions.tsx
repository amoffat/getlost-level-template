import { sliceTileset } from "@/editors/tileset/loader";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors } from "@/slices/tilesetEditor";
import { replaceTilesetImageThunk, uploadTilesetThunk } from "@/thunks/tileset";
import { Rect } from "@/types/rect";
import { packSprites } from "@/utils/spritepack";
import { Button, Group, Image, Select, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconLibraryPhoto,
  IconPhotoPlus,
  IconRefresh,
} from "@tabler/icons-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import RestrictedControl from "./RestrictedControl";

const NEW_TILESET = "__new_tileset__";
const MERGE_UPLOADS = "__merge_uploads__";
const REPLACE_IMAGE_PREFIX = "__replace_image__:";

function makeReplaceImageValue(tsId: string): string {
  return `${REPLACE_IMAGE_PREFIX}${tsId}`;
}

function isReplaceImageValue(v: string): boolean {
  return v.startsWith(REPLACE_IMAGE_PREFIX);
}

function getReplaceImageTsId(v: string): string {
  return v.slice(REPLACE_IMAGE_PREFIX.length);
}

export type SpecialTilesetOption = typeof NEW_TILESET | typeof MERGE_UPLOADS;

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
  const { t } = useTranslation();
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
    groups.push({ group: t("tilesetUploadNewTilesets"), items: ntGroups });

    ntGroups.push({
      value: NEW_TILESET,
      label:
        files.length === 1
          ? t("tilesetUploadCreateNew")
          : t("tilesetUploadCreateNewForEach"),
    });

    if (files.length > 1) {
      ntGroups.push({
        value: MERGE_UPLOADS,
        label: t("tilesetUploadMergeUploads", { count: files.length }),
      });
    }

    const existingTilesets = Object.values(tilesets).map((tileset) => ({
      value: tileset.id,
      label: t("tilesetUploadMergeInto", { id: tileset.id }),
    }));

    if (existingTilesets.length > 0) {
      groups.push({
        group: t("tilesetUploadExistingTilesets"),
        items: existingTilesets,
      });
    }

    // "Replace image" group only makes sense for a single-file upload
    if (files.length === 1 && Object.keys(tilesets).length > 0) {
      const replaceItems = Object.values(tilesets).map((tileset) => ({
        value: makeReplaceImageValue(tileset.id),
        label: t("tilesetUploadReplaceImageOf", { id: tileset.id }),
      }));
      groups.push({
        group: t("tilesetUploadReplaceExisting"),
        items: replaceItems,
      });
    }

    return groups;
  }, [tilesets, files.length, t]);

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

    const tsId = isReplaceImageValue(value)
      ? getReplaceImageTsId(value)
      : value;
    const tileset = tilesets[tsId];
    if (!tileset) return <span>{label}</span>;

    if (isReplaceImageValue(value)) {
      return (
        <Group gap="sm">
          <IconRefresh size={16} style={{ flexShrink: 0 }} />
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
    }

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

    const { creationOption: copt, restricted } = values;

    if (isReplaceImageValue(copt)) {
      const tsId = getReplaceImageTsId(copt);
      if (!tilesets[tsId]) return;

      const objectUrl = URL.createObjectURL(files[0]);
      try {
        const result = await dispatch(
          replaceTilesetImageThunk({ tsId, objectUrl }),
        ).unwrap();
        // Close the modal only if the replacement actually succeeded.
        // On dimension mismatch or API error the thunk shows a notification
        // and returns { replaced: false }, keeping the modal open.
        if (result?.replaced) closeModal();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      return;
    }

    closeModal();

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
          label={t("tilesetUploadAssetCreation")}
          description={t("tilesetUploadAssetCreationDesc")}
          placeholder={t("tilesetUploadChooseTileset")}
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
            {t("tilesetUploadSubmitBtn")}
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
