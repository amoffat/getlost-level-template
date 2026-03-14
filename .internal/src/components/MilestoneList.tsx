import { useAppSelector } from "@/hooks/redux";
import { RootState } from "@/store/store";
import {
  Checkbox,
  CloseButton,
  Fieldset,
  Stack,
  TextInput,
} from "@mantine/core";
import { IconFilter, IconStarFilled } from "@tabler/icons-react";
import { useMemo, useState } from "react";

interface AncestorHighlight {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

interface MilestoneListProps {
  selectedNodeId: string | null;
  ancestorHighlight: AncestorHighlight;
  onSelect?: (nodeId: string | null) => void;
}

/**
 * Left-pane fieldset listing all story milestone nodes with ancestor
 * highlighting for the currently selected node.
 *
 * Returns null when there are no milestone nodes in the story.
 */
export default function MilestoneList({
  selectedNodeId,
  ancestorHighlight,
  onSelect,
}: MilestoneListProps) {
  const nodes = useAppSelector((state: RootState) => state.story.nodes);
  const [filter, setFilter] = useState("");

  // Alphabetical sort milestone nodes
  const sortedMilestoneIds = useMemo(() => {
    const sorted = nodes
      .filter((n) => n.type === "story")
      .sort((a, b) => {
        const nameA = a.data.id;
        const nameB = b.data.id;
        return nameA.localeCompare(nameB);
      });

    return sorted.map((n) => n.id);
  }, [nodes]);

  // Map node internal IDs to their user-facing milestone IDs
  const nodeIdToMilestoneId = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of nodes) {
      if (node.type === "story") {
        map.set(node.id, (node.data.id as string) || node.id);
      }
    }
    return map;
  }, [nodes]);

  const filteredMilestoneIds = useMemo(() => {
    if (!filter.trim()) return sortedMilestoneIds;
    const lower = filter.toLowerCase();
    return sortedMilestoneIds.filter((nodeId) =>
      (nodeIdToMilestoneId.get(nodeId) ?? nodeId).toLowerCase().includes(lower),
    );
  }, [sortedMilestoneIds, nodeIdToMilestoneId, filter]);

  if (sortedMilestoneIds.length === 0) {
    return null;
  }

  return (
    <Fieldset legend="Milestones" p="xs">
      <Stack gap="xs" p={0}>
        <TextInput
          mb="xs"
          placeholder="Filter..."
          leftSection={<IconFilter size={14} />}
          rightSection={
            filter ? (
              <CloseButton size="sm" onClick={() => setFilter("")} />
            ) : null
          }
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          size="xs"
        />
        {filteredMilestoneIds.map((nodeId) => {
          const isSelected = nodeId === selectedNodeId;
          const cProps = isSelected
            ? { color: "green", icon: IconStarFilled }
            : {};
          return (
            <Checkbox
              key={nodeId}
              label={nodeIdToMilestoneId.get(nodeId) ?? nodeId}
              checked={isSelected || ancestorHighlight.nodeIds.has(nodeId)}
              onChange={() => {
                if (onSelect) {
                  onSelect(isSelected ? null : nodeId);
                }
              }}
              size="sm"
              style={{ cursor: onSelect ? "pointer" : "default" }}
              {...cProps}
            />
          );
        })}
      </Stack>
    </Fieldset>
  );
}
