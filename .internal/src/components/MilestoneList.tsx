import { useAppSelector } from "@/hooks/redux";
import { RootState } from "@/store/store";
import {
  Checkbox,
  CloseButton,
  Fieldset,
  Group,
  Stack,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconFilter, IconInfinity } from "@tabler/icons-react";
import { ComponentType, FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface AncestorHighlight {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

interface MilestoneListProps {
  legend?: string;
  selectedNodeIds: string[];
  ancestorHighlight?: AncestorHighlight;
  onSelect?: (nodeIds: string[]) => void;
  selectedIcon?: ComponentType<{ size?: number }>;
}

/**
 * Left-pane fieldset listing all story milestone nodes with ancestor
 * highlighting for the currently selected node.
 *
 * Returns null when there are no milestone nodes in the story.
 */
export default function MilestoneList({
  legend,
  selectedNodeIds,
  ancestorHighlight,
  onSelect,
  selectedIcon: SelectedIcon,
}: MilestoneListProps) {
  const { t } = useTranslation();
  const legendText = legend ?? t("milestoneListDefaultLegend");
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

  // Map node internal IDs to their permanent flag
  const nodeIdToPermanent = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const node of nodes) {
      if (node.type === "story") {
        map.set(node.id, node.data.permanent === true);
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
    <Fieldset legend={legendText} p="xs">
      <Stack gap="xs" p={0}>
        <TextInput
          mb="xs"
          placeholder={t("milestoneListFilterPlaceholder")}
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
          const isSelected = selectedNodeIds.includes(nodeId);
          const isPermanent = nodeIdToPermanent.get(nodeId) ?? false;
          const milestoneName = nodeIdToMilestoneId.get(nodeId) ?? nodeId;
          const label = isPermanent ? (
            <Group gap={4} wrap="nowrap">
              {milestoneName}
              <Tooltip label={t("milestoneListPermanentTooltip")} withArrow>
                <IconInfinity size={14} color="gold" />
              </Tooltip>
            </Group>
          ) : (
            milestoneName
          );
          return (
            <Checkbox
              key={nodeId}
              label={label}
              checked={!!(isSelected || ancestorHighlight?.nodeIds.has(nodeId))}
              onChange={() => {
                if (onSelect) {
                  const next = isSelected
                    ? selectedNodeIds.filter((id) => id !== nodeId)
                    : [...selectedNodeIds, nodeId];
                  onSelect(next);
                }
              }}
              size="sm"
              style={{ cursor: onSelect ? "pointer" : "default" }}
              color={isSelected ? "green" : undefined}
              icon={
                isSelected
                  ? (SelectedIcon as unknown as FC<{
                      indeterminate: boolean | undefined;
                      className: string;
                    }>)
                  : undefined
              }
            />
          );
        })}
      </Stack>
    </Fieldset>
  );
}
