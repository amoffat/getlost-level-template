import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { setActiveLayerThunk } from "@/thunks/map";
import { MapLayerName } from "@/types/layer";
import { ActionIcon, Fieldset, SimpleGrid, Tooltip } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { ReactNode, useMemo } from "react";

export interface ToolDescriptor {
  name: string;
  icon: ReactNode;
  // allow disabled state in future
  enabled?: boolean;
  switchToLayer?: MapLayerName;
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
 * Responsive tool palette grid that auto-computes columns based on width.
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
  const { ref, width } = useElementSize();
  const dispatch = useAppDispatch();
  const curLayer = useAppSelector((state) => state.mapEditor.layers.active);

  const cols = useMemo(() => {
    return Math.max(1, Math.floor((width + gap) / (iconSize + gap)));
  }, [width, gap, iconSize]);

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

        if (t.switchToLayer !== undefined && t.switchToLayer !== curLayer) {
          dispatch(
            setActiveLayerThunk({ layer: t.switchToLayer, notify: true })
          );
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
      <SimpleGrid ref={ref} cols={cols} spacing={gap} verticalSpacing={gap}>
        {toolComponents}
      </SimpleGrid>
    </Fieldset>
  );
}
