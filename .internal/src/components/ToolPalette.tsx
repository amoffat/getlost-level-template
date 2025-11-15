import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { setActiveLayerThunk } from "@/thunks/map";
import { MapLayerName } from "@/types/layer";
import { ActionIcon, Fieldset, Group, Tooltip } from "@mantine/core";
import { ReactNode, useMemo } from "react";

export interface ToolDescriptor {
  name: string;
  icon: ReactNode;
  // allow disabled state in future
  enabled?: boolean;
  layerConstraints?: MapLayerName[];
  options?: ReactNode;
}

interface ToolPaletteProps<T extends string> {
  tools: Partial<Record<T, ToolDescriptor>>;
  activeTool: T | null;
  legend?: string;
  iconSize?: number; // px square side; default 32
  gap?: number; // px gap; default 4
  onToolActivated?: (slug: T) => void;
  onToolDeactivated?: (slug: T) => void;
}

/**
 * Responsive tool palette that auto-wraps based on available width.
 */
export default function ToolPalette<T extends string>({
  tools,
  activeTool,
  legend = "Tools",
  iconSize = 32,
  gap = 4,
  onToolActivated,
  onToolDeactivated,
}: ToolPaletteProps<T>) {
  const dispatch = useAppDispatch();
  const curLayer = useAppSelector((state) => state.mapEditor.layers.active);

  const toolComponents: ReactNode[] = useMemo(() => {
    const buttons = [];
    for (const [slug, t] of Object.entries(tools) as [T, ToolDescriptor][]) {
      const isActive = activeTool === slug;
      const enabled = t.enabled ?? true;

      const onClick = () => {
        // Deactivate if already active
        if (activeTool === slug) {
          onToolDeactivated?.(slug);
          return;
        }

        if (!enabled) return;

        if (t.layerConstraints !== undefined && t.layerConstraints.length > 0) {
          // Check if current layer is in the constraints
          if (!t.layerConstraints.includes(curLayer)) {
            // Switch to the first constrained layer
            dispatch(
              setActiveLayerThunk({
                layer: t.layerConstraints[0],
                notify: true,
              })
            );
          }
        }
        onToolActivated?.(slug);
      };

      buttons.push(
        <Tooltip
          key={slug}
          label={t.name}
          position="left-start"
          withArrow
          openDelay={500}
        >
          <ActionIcon
            variant={isActive ? "filled" : "default"}
            size={iconSize}
            style={{ aspectRatio: "1 / 1", padding: 0 }}
            onClick={onClick}
            aria-label={t.name}
            disabled={!enabled}
          >
            {t.icon}
          </ActionIcon>
        </Tooltip>
      );
    }
    return buttons;
  }, [
    activeTool,
    curLayer,
    dispatch,
    iconSize,
    onToolActivated,
    onToolDeactivated,
    tools,
  ]);

  return (
    <Fieldset p={"xs"} legend={legend}>
      <Group gap={gap} wrap="wrap">
        {toolComponents}
      </Group>
    </Fieldset>
  );
}
