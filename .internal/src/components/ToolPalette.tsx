import { ActionIcon, Fieldset, SimpleGrid, Tooltip } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { ReactNode, useMemo, useState } from "react";

export interface ToolDescriptor<T extends string> {
  slug: T;
  name: string;
  icon: ReactNode;
  canActivate: boolean;
  onClick?: () => void;
  // allow disabled state in future
  disabled?: boolean;
}

interface ToolPaletteProps<T extends string> {
  tools: ToolDescriptor<T>[];
  legend?: string;
  iconSize?: number; // px square side; default 32
  gap?: number; // px gap; default 4
  onToolActivated?: (slug: T) => void;
}

/**
 * Responsive tool palette grid that auto-computes columns based on width.
 */
export default function ToolPalette<T extends string>({
  tools,
  legend = "Tools",
  iconSize = 32,
  gap = 4,
  onToolActivated,
}: ToolPaletteProps<T>) {
  const { ref, width } = useElementSize();
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const cols = useMemo(() => {
    return Math.max(1, Math.floor((width + gap) / (iconSize + gap)));
  }, [width, gap, iconSize]);

  const toolComponents = [];
  for (const t of tools) {
    const isActive = activeTool === t.slug;

    const onClick = () => {
      // Deactivate if already active
      if (activeTool === t.slug) {
        setActiveTool(null);
        return;
      }

      if (t.disabled) return;
      if (t.canActivate) {
        setActiveTool(t.slug);
        onToolActivated?.(t.slug);
      }
      t.onClick?.();
    };

    toolComponents.push(
      <Tooltip key={t.slug} label={t.name} position="left-start" withArrow>
        <ActionIcon
          variant={isActive ? "filled" : "default"}
          size={iconSize}
          style={{ aspectRatio: "1 / 1", padding: 0 }}
          onClick={onClick}
          aria-label={t.name}
          disabled={t.disabled}
        >
          {t.icon}
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <Fieldset p={"xs"} legend={legend}>
      <SimpleGrid ref={ref} cols={cols} spacing={gap} verticalSpacing={gap}>
        {toolComponents}
      </SimpleGrid>
    </Fieldset>
  );
}
