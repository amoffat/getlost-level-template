import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as dSelectors } from "@/slices/dialogue";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { setNodeData, StoryNodeData } from "@/slices/story";
import { RootState } from "@/store/store";
import { Dialogue } from "@/types/dialogue";
import { SpeakableMapObj } from "@/types/map";
import { createUrlPath } from "@/utils/dialogue";
import {
  Button,
  Checkbox,
  Fieldset,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface MilestoneEditorProps {
  nodeId: string;
  autoFocus?: boolean;
}

/**
 * Editing panel for a selected story milestone node.
 * Renders in the right pane of the StoryTab.
 */
export default function MilestoneEditor({
  nodeId,
  autoFocus,
}: MilestoneEditorProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const node = useAppSelector((state: RootState) =>
    state.story.nodes.find((n) => n.id === nodeId),
  );

  // data.id is the human-readable milestone name shown in the UI.
  // node.id (nodeId) is the stable UUID used for dialogue linkage.
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
  const isEmpty = localName === "";
  const isDuplicate = !isEmpty && otherIdsSet.has(localName);

  const dialogues = useAppSelector((state: RootState) =>
    dSelectors.dialogueForMilestone(state, nodeId),
  );

  const debouncedDispatch = useDebouncedCallback(
    (data: Partial<StoryNodeData>) => {
      dispatch(setNodeData({ id: nodeId, data }));
    },
    300,
  );

  const sanitizeName = useCallback((value: string) => {
    return (
      value
        .toLowerCase()
        // Replace spaces and non-ASCII characters with dashes
        .replace(/[^\x21-\x7e]/g, "-")
        // Replace any remaining non-alphanumeric/dash characters with dashes
        .replace(/[^a-z0-9-]/g, "-")
    );
  }, []);

  const onNameChange = useCallback(
    (value: string) => {
      const sanitized = sanitizeName(value);
      setLocalName(sanitized);
      // Only persist if non-empty and unique
      if (sanitized !== "" && !otherIdsSet.has(sanitized)) {
        debouncedDispatch({ id: sanitized });
      }
    },
    [sanitizeName, otherIdsSet, debouncedDispatch],
  );

  const onPermanentChange = useCallback(
    (permanent: boolean) => {
      debouncedDispatch({ permanent });
    },
    [debouncedDispatch],
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

  const nameError = isEmpty
    ? "Name cannot be empty."
    : isDuplicate
      ? "This milestone name is already in use."
      : undefined;

  return (
    <Stack p={0} gap="md">
      <Fieldset legend="Milestone Details" p="xs">
        <Stack p={0} gap="md">
          <TextInput
            label="Name"
            description="A name to reference this milestone. Must be unique."
            required
            value={localName}
            onChange={(e) => onNameChange(e.currentTarget.value)}
            error={nameError}
            autoFocus={autoFocus}
            onFocus={(e) => e.currentTarget.select()}
          />

          <Checkbox
            label="Permanent"
            description="Should this become part of the player's permanent action history?"
            defaultChecked={node.data.permanent ?? false}
            onChange={(e) => onPermanentChange(e.currentTarget.checked)}
          />
        </Stack>
      </Fieldset>

      {dialogues.length > 0 && (
        <Fieldset legend="Dialogues" p="xs">
          <Stack p={0} gap="xs">
            {dialogues.map((dlg) => (
              <DialogueRow
                key={dlg.id}
                dialogue={dlg}
                milestoneNodeId={nodeId}
                onNavigate={(path) => navigate(path)}
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
  milestoneNodeId,
  onNavigate,
}: {
  dialogue: Dialogue;
  milestoneNodeId: string;
  onNavigate: (path: string) => void;
}) {
  const obj = useAppSelector((state: RootState) =>
    dialogue.subjectId
      ? mapSelectors.selectObject(state, dialogue.subjectId)
      : undefined,
  ) as SpeakableMapObj | undefined;

  const name = obj?.name ?? dialogue.id;
  const path = createUrlPath({ id: dialogue.id, milestone: milestoneNodeId });

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
