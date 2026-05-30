import { storyOriginNodeId } from "@/constants";
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
import { IconFilter, IconInfinity, IconLock } from "@tabler/icons-react";
import { ComponentType, FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface MilestoneListProps {
  legend?: string;
  checkboxState: Record<string, boolean>;
  ancestorHighlight?: Set<string>;
  onChange?: (state: Record<string, boolean>) => void;
  selectedIcon?: ComponentType<{ size?: number }>;
}

/**
 * Fieldset listing all story milestone nodes with ancestor
 * highlighting for the currently selected node.
 *
 * Returns null when there are no milestone nodes in the story.
 */
export default function MilestoneList({
  legend,
  checkboxState,
  ancestorHighlight,
  onChange,
  selectedIcon: SelectedIcon,
}: MilestoneListProps) {
  const { t } = useTranslation();
  const legendText = legend ?? t("milestoneListDefaultLegend");
  const nodes = useAppSelector((state: RootState) => state.story.nodes);
  const [filter, setFilter] = useState("");

  // Alphabetical sort milestone nodes, origin node always first
  const sortedMilestoneIds = useMemo(() => {
    const sorted = nodes
      .filter((n) => n.type === "story")
      .sort((a, b) => {
        if (a.id === storyOriginNodeId) return -1;
        if (b.id === storyOriginNodeId) return 1;
        return (a.data.id as string).localeCompare(b.data.id as string);
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
          const milestoneName = nodeIdToMilestoneId.get(nodeId) ?? nodeId;
          const isOrigin = nodeId === storyOriginNodeId;
          const isSelected = isOrigin || (checkboxState[nodeId] ?? false);
          const isPermanent = nodeIdToPermanent.get(nodeId) ?? false;
          const label = isOrigin ? (
            <Group gap={4} wrap="nowrap">
              {milestoneName}
              <Tooltip label={t("milestoneListOriginTooltip")} withArrow>
                <IconLock size={14} color="green" />
              </Tooltip>
            </Group>
          ) : isPermanent ? (
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
              checked={!!(isSelected || ancestorHighlight?.has(nodeId))}
              disabled={isOrigin}
              onChange={() => {
                if (onChange && !isOrigin) {
                  onChange({ ...checkboxState, [nodeId]: !isSelected });
                }
              }}
              size="sm"
              style={{ cursor: onChange && !isOrigin ? "pointer" : "default" }}
              color={isSelected ? "green" : undefined}
              icon={
                isSelected && !isOrigin
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
