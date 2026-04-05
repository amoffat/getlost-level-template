import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as mapActions } from "@/slices/mapEditor";
import { RootState } from "@/store/store";
import { MapLayerName } from "@/types/layer";
import { BackgroundImageObj, isBackgroundImageObj } from "@/types/map";
import { closestCenter, DndContext, DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Image,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconGripVertical,
  IconPhotoPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";
import UploadAssetModal from "../../uploadAssets/UploadAssetModal";

export default function BackgroundTool() {
  const dispatch = useAppDispatch();

  // Derive background image objects from the entity adapter, sorted by z (descending = top first)
  const backgroundObjs = useAppSelector((state: RootState) => {
    const entities = state.mapEditor.objects.entities;
    return Object.values(entities)
      .filter(
        (o): o is BackgroundImageObj =>
          isBackgroundImageObj(o as any) &&
          (o as BackgroundImageObj).layer === MapLayerName.Background,
      )
      .sort((a, b) => b.z - a.z);
  });

  const selectedIds = useAppSelector(
    (state: RootState) => state.mapEditor.selectedIds,
  );

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openUploadModal = useCallback((files: File[]) => {
    setPendingFiles(files);
    setUploadModalOpen(true);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        openUploadModal(files);
      }
      e.target.value = "";
    },
    [openUploadModal],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const fromIdx = backgroundObjs.findIndex((o) => o.id === active.id);
      const toIdx = backgroundObjs.findIndex((o) => o.id === over.id);
      if (fromIdx === -1 || toIdx === -1) return;

      const reordered = arrayMove(backgroundObjs, fromIdx, toIdx);
      // Reassign z values: first item in list = top of canvas = highest z
      const maxZ = backgroundObjs[0]?.z ?? reordered.length - 1;
      dispatch(
        mapActions.updateMany(
          reordered.map((obj, i) => ({
            id: obj.id,
            changes: { z: maxZ - i },
          })),
        ),
      );
    },
    [dispatch, backgroundObjs],
  );

  const handleSelect = useCallback(
    (id: string) => {
      dispatch(mapActions.setOneSelected(id));
    },
    [dispatch],
  );

  const handleRemove = useCallback(
    (id: string) => {
      dispatch(mapActions.removeOne(id));
    },
    [dispatch],
  );

  return (
    <Stack p={0} gap="xs">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />

      <Button
        leftSection={<IconPhotoPlus size={16} />}
        variant="light"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      >
        Add image
      </Button>

      {backgroundObjs.length === 0 ? (
        <Text size="xs" c="dimmed" ta="center" py="sm">
          No background images yet. Add an image or drag one onto the canvas.
        </Text>
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={backgroundObjs.map((o) => o.id)}
            strategy={verticalListSortingStrategy}
          >
            <Stack p={0} gap={2}>
              {backgroundObjs.map((obj, idx) => (
                <SortableImageRow
                  key={obj.id}
                  obj={obj}
                  index={idx}
                  isSelected={selectedIds.includes(obj.id)}
                  onSelect={handleSelect}
                  onRemove={handleRemove}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      )}

      <UploadAssetModal
        mode="background"
        files={pendingFiles}
        opened={uploadModalOpen}
        closeModal={() => setUploadModalOpen(false)}
      />
    </Stack>
  );
}

interface SortableImageRowProps {
  obj: BackgroundImageObj;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

function SortableImageRow({
  obj,
  index,
  isSelected,
  onSelect,
  onRemove,
}: SortableImageRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: obj.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const thumbnailSrc = g.backgroundImageObjectUrlCache.get(obj.imageId);

  return (
    <Group
      ref={setNodeRef}
      style={style}
      gap="xs"
      wrap="nowrap"
      p={2}
      onClick={() => onSelect(obj.id)}
      styles={{
        root: {
          cursor: "pointer",
          border: isSelected
            ? "1px solid var(--mantine-color-green-6)"
            : "1px solid var(--mantine-color-default-border)",
          background: isSelected
            ? "var(--mantine-color-green-light)"
            : "var(--mantine-color-default)",
        },
      }}
    >
      {/* Drag handle */}
      <Box
        {...attributes}
        {...listeners}
        style={{ cursor: "grab", color: "var(--mantine-color-dimmed)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <IconGripVertical size={16} />
      </Box>

      {/* Thumbnail */}
      <Image
        src={thumbnailSrc}
        w={48}
        h={36}
        fit="cover"
        style={{ flexShrink: 0 }}
      />

      {/* Layer index label */}
      <Text size="xs" c="dimmed" style={{ flex: 1 }} lineClamp={1}>
        Layer {index + 1}
      </Text>

      {/* Delete */}
      <ActionIcon
        variant="subtle"
        color="red"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(obj.id);
        }}
        aria-label="Remove background image"
      >
        <IconTrash size={14} />
      </ActionIcon>
    </Group>
  );
}
