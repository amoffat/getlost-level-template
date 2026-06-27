import { useAppSelector } from "@/hooks/redux";
import { useParticipantList } from "@/hooks/useParticipant";
import { selectors as dSelectors } from "@/slices/dialogue";
import type { RootState } from "@/store/store";
import type { Dialogue } from "@/types/dialogue";
import { participantsOf } from "@/utils/dialogue";
import {
  Badge,
  Group,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ParticipantAvatar } from "./Participant";

/**
 * Compact, self-contained summary of a single dialogue: its participant avatars
 * (each with a name tooltip), a truncated snippet of the origin node text, and
 * its activating milestone badges. Resolves participant and milestone names
 * internally so callers only need to pass the dialogue itself.
 *
 * Shared by the DialogueTab left pane and the StoryTab milestone editor.
 */
export function DialogueListItem({
  dialogue,
  active = false,
  onOpen,
}: {
  dialogue: Dialogue;
  active?: boolean;
  onOpen: (dlg: Dialogue) => void;
}) {
  const { t } = useTranslation();

  const participantOptions = useParticipantList();
  const storyNodes = useAppSelector((state: RootState) => state.story.nodes);

  const idToName = useMemo(
    () => new Map(participantOptions.map((o) => [o.value, o.label])),
    [participantOptions],
  );
  const msIdToName = useMemo(
    () => new Map(storyNodes.map((n) => [n.id, n.data.id] as [string, string])),
    [storyNodes],
  );

  const snippet = useAppSelector((state) =>
    dSelectors.selectFirstNodeText(state, dialogue.id),
  );

  // Subject first, then the remaining participants by display name.
  const parts = [...participantsOf(dialogue)].sort((a, b) => {
    if (a === dialogue.initiatingChar) return -1;
    if (b === dialogue.initiatingChar) return 1;
    return (idToName.get(a) ?? a).localeCompare(idToName.get(b) ?? b);
  });

  return (
    <UnstyledButton
      onClick={() => onOpen(dialogue)}
      px="xs"
      py={6}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        borderRadius: "var(--mantine-radius-sm)",
        background: active ? "var(--mantine-color-dark-5)" : undefined,
      }}
    >
      <Stack gap={4} p={0}>
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <Group gap={0} wrap="nowrap" style={{ flexShrink: 0 }}>
            {parts.map((p) => (
              <Tooltip
                key={p}
                label={idToName.get(p) ?? p}
                withinPortal
                withArrow
              >
                <ParticipantAvatar participantId={p} size={16} scale={1.5} />
              </Tooltip>
            ))}
          </Group>
          <Text
            fz="sm"
            c="dimmed"
            truncate="end"
            style={{ minWidth: 0, flex: 1 }}
          >
            {snippet}
          </Text>
        </Group>
        <Group gap={4} mt={4} wrap="wrap">
          {dialogue.milestoneNodeIds.length === 0 ? (
            <Badge
              size="xs"
              variant="light"
              color="orange"
              leftSection={<IconAlertTriangle size={10} />}
            >
              {t("dialogueTabNoMilestone")}
            </Badge>
          ) : (
            dialogue.milestoneNodeIds.map((m) => (
              <Badge key={m} size="xs" variant="light" color="gray">
                {msIdToName.get(m) ?? m}
              </Badge>
            ))
          )}
        </Group>
      </Stack>
    </UnstyledButton>
  );
}
