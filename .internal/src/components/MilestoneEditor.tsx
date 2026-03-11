import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as dSelectors } from "@/slices/dialogue";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { setNodeData } from "@/slices/story";
import { RootState } from "@/store/store";
import { Dialogue } from "@/types/dialogue";
import { SpeakableMapObj } from "@/types/map";
import { createUrlPath } from "@/utils/dialogue";
import { Button, Fieldset, Group, Stack, Text, TextInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface MilestoneEditorProps {
  nodeId: string;
}

/**
 * Editing panel for a selected story milestone node.
 * Renders in the right pane of the StoryTab.
 */
export default function MilestoneEditor({ nodeId }: MilestoneEditorProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const node = useAppSelector((state: RootState) =>
    state.story.nodes.find((n) => n.id === nodeId),
  );

  const milestoneId = node?.data.id ?? "";

  // Collect all other milestone IDs for uniqueness checking
  const otherMilestoneIds = useAppSelector((state: RootState) =>
    state.story.nodes.filter((n) => n.id !== nodeId).map((n) => n.data.id),
  );
  const otherIdsSet = useMemo(
    () => new Set(otherMilestoneIds),
    [otherMilestoneIds],
  );

  const [localName, setLocalName] = useState(milestoneId);
  const isDuplicate = localName !== "" && otherIdsSet.has(localName);

  const dialogues = useAppSelector((state: RootState) =>
    dSelectors.dialogueForMilestone(state, milestoneId),
  );

  const debouncedDispatch = useDebouncedCallback((value: string) => {
    dispatch(setNodeData({ id: nodeId, data: { id: value } }));
  }, 300);

  const onNameChange = useCallback(
    (value: string) => {
      setLocalName(value);
      // Only persist if the name is unique
      if (!otherIdsSet.has(value)) {
        debouncedDispatch(value);
      }
    },
    [otherIdsSet, debouncedDispatch],
  );

  if (!node) {
    return (
      <Stack align="center" justify="center" style={{ height: "100%" }}>
        <Text size="sm" c="dimmed">
          Select a milestone node to edit its properties.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack p={0} gap="md">
      <Fieldset legend="Milestone Details" p="xs">
        <TextInput
          label="Name"
          description="A name to reference this milestone. Must be unique."
          defaultValue={milestoneId}
          onChange={(e) => onNameChange(e.currentTarget.value)}
          error={
            isDuplicate ? "This milestone name is already in use." : undefined
          }
        />
      </Fieldset>

      {dialogues.length > 0 && (
        <Fieldset legend="Dialogues" p="xs">
          <Stack p={0} gap="xs">
            {dialogues.map((dlg) => (
              <DialogueRow
                key={dlg.id}
                dialogue={dlg}
                milestoneId={milestoneId}
                onNavigate={(path) => navigate(`/dialogues/${path}`)}
              />
            ))}
          </Stack>
        </Fieldset>
      )}
    </Stack>
  );
}

function DialogueRow({
  dialogue,
  milestoneId,
  onNavigate,
}: {
  dialogue: Dialogue;
  milestoneId: string;
  onNavigate: (path: string) => void;
}) {
  const obj = useAppSelector((state: RootState) =>
    dialogue.subjectId
      ? mapSelectors.selectObject(state, dialogue.subjectId)
      : undefined,
  ) as SpeakableMapObj | undefined;

  const name = obj?.name ?? dialogue.id;
  const path = createUrlPath(dialogue.id, milestoneId);

  return (
    <Group gap="xs" wrap="nowrap">
      <Text size="sm" style={{ flex: 1 }}>
        {name}
      </Text>
      <Button variant="subtle" size="xs" onClick={() => onNavigate(path)}>
        Edit
      </Button>
    </Group>
  );
}
