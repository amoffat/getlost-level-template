import Tip from "@/components/Tip";
import { globals as mapEditorGlobals } from "@/editors/map/globals";
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
  Group,
  Image,
  Slider,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconEye,
  IconEyeOff,
  IconGripVertical,
  IconTrash,
} from "@tabler/icons-react";
import { ReactNode, useCallback, useMemo, useState } from "react";
import classes from "./BackgroundTool.module.css";

export default function BackgroundTool() {
  const dispatch = useAppDispatch();

  const [parallaxDisabledIds, setParallaxDisabledIds] = useState<Set<string>>(
    new Set(),
  );
  const [allParallaxEnabled, setAllParallaxEnabled] = useState(true);

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

  const handleParallaxChange = useCallback(
    (id: string, axis: "x" | "y", value: number) => {
      const obj = backgroundObjs.find((o) => o.id === id);
      if (!obj) return;
      dispatch(
        mapActions.updateOne({
          id,
          changes: {
            parallax: { ...obj.parallax, [axis]: value },
          },
        }),
      );
    },
    [dispatch, backgroundObjs],
  );

  const handleParallaxToggle = useCallback((id: string) => {
    setParallaxDisabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      mapEditorGlobals.parallaxDisabledIds = next;
      return next;
    });
  }, []);

  const handleAllParallaxToggle = useCallback(
    (enabled: boolean) => {
      setAllParallaxEnabled(enabled);
      const next = enabled
        ? new Set<string>()
        : new Set(backgroundObjs.map((o) => o.id));
      setParallaxDisabledIds(next);
      mapEditorGlobals.parallaxDisabledIds = next;
    },
    [backgroundObjs],
  );

  const tips: ReactNode[] = useMemo(() => {
    const tips: ReactNode[] = [];

    tips.push(
      "Add a new background image by dragging and dropping it onto the editor.",
    );

    if (backgroundObjs.length > 0) {
      tips.push(
        "Move a background image around by selecting and dragging it in the editor.",
      );
      if (backgroundObjs.length > 1) {
        tips.push(
          "Re-order the background images by dragging their handles below.",
        );
      }
    }

    return tips;
  }, [backgroundObjs]);

  return (
    <Stack p={0} gap="xs">
      <Tip tips={tips} />

      {backgroundObjs.length > 0 && (
        <Switch
          label="Parallax preview"
          description="Toggle parallax effect for all layers"
          checked={allParallaxEnabled}
          onChange={(e) => handleAllParallaxToggle(e.currentTarget.checked)}
        />
      )}

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={backgroundObjs.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          <Stack p={0} gap="xs">
            {backgroundObjs.map((obj) => (
              <SortableImageRow
                key={obj.id}
                obj={obj}
                isSelected={selectedIds.includes(obj.id)}
                parallaxEnabled={!parallaxDisabledIds.has(obj.id)}
                onSelect={handleSelect}
                onRemove={handleRemove}
                onParallaxChange={handleParallaxChange}
                onParallaxToggle={handleParallaxToggle}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>
    </Stack>
  );
}

interface SortableImageRowProps {
  obj: BackgroundImageObj;
  isSelected: boolean;
  parallaxEnabled: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onParallaxChange: (id: string, axis: "x" | "y", value: number) => void;
  onParallaxToggle: (id: string) => void;
}

function SortableImageRow({
  obj,
  isSelected,
  parallaxEnabled,
  onSelect,
  onRemove,
  onParallaxChange,
  onParallaxToggle,
}: SortableImageRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: obj.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const thumbnailSrc = g.backgroundImageObjectUrlCache.get(obj.imageId);

  return (
    <Stack
      ref={setNodeRef}
      style={style}
      gap={4}
      p={4}
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
      {/* Top row: drag handle, parallax toggle, delete */}
      <Group gap="xs" wrap="nowrap" justify="space-between">
        <Box
          {...attributes}
          {...listeners}
          style={{ cursor: "grab", color: "var(--mantine-color-dimmed)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <IconGripVertical size={16} />
        </Box>
        <Group gap={4} wrap="nowrap">
          <Tooltip
            label={
              parallaxEnabled
                ? "Disable parallax preview"
                : "Enable parallax preview"
            }
            withArrow
            position="left"
          >
            <ActionIcon
              variant="subtle"
              color={parallaxEnabled ? "blue" : "gray"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onParallaxToggle(obj.id);
              }}
              aria-label={
                parallaxEnabled
                  ? "Disable parallax preview"
                  : "Enable parallax preview"
              }
            >
              {parallaxEnabled ? (
                <IconEye size={14} />
              ) : (
                <IconEyeOff size={14} />
              )}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Remove background image" withArrow position="left">
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
          </Tooltip>
        </Group>
      </Group>

      <Box className={classes.thumbnailWrapper}>
        <Box className={classes.thumbnailCheckers} />
        <Image
          src={thumbnailSrc}
          w="100%"
          h={80}
          fit="cover"
          className={classes.thumbnailImage}
        />
      </Box>

      {/* Parallax sliders */}
      <Stack gap={2} onClick={(e) => e.stopPropagation()}>
        <Text size="xs" c="dimmed">
          Parallax X: {obj.parallax.x.toFixed(2)}
        </Text>
        <Slider
          min={0}
          max={1}
          step={0.01}
          defaultValue={obj.parallax.x}
          onChangeEnd={(v) => onParallaxChange(obj.id, "x", v)}
          size="xs"
        />
        <Text size="xs" c="dimmed">
          Parallax Y: {obj.parallax.y.toFixed(2)}
        </Text>
        <Slider
          min={0}
          max={1}
          step={0.01}
          defaultValue={obj.parallax.y}
          onChangeEnd={(v) => onParallaxChange(obj.id, "y", v)}
          size="xs"
        />
      </Stack>
    </Stack>
  );
}
