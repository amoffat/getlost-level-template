import * as constants from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors as dSelectors } from "@/slices/dialogue";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { RootState } from "@/store/store";
import { Choice, SpeechData } from "@/types/dialogue";
import { SpeakableMapObj } from "@/types/map";
import { closestCenter, DndContext, DragEndEvent } from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Button,
  CloseButton,
  Fieldset,
  Group,
  Input,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconGripVertical } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import InfoTooltip from "./common/InfoTooltip";
import ResettableInput from "./ResettableInput";

interface SpeechEditorProps {
  nodeId: string;
}

/**
 * Editing panel for a selected dialogue speech node.
 * Renders in the right pane of the DialogueTab.
 */
export default function SpeechEditor({ nodeId }: SpeechEditorProps) {
  const dispatch = useAppDispatch();

  const [resetKey, setResetKey] = useState(0);
  const activeDialogueId = useAppSelector(
    (state: RootState) => state.dialogue.activeDialogueId,
  )!;

  const node = useAppSelector((state: RootState) =>
    dSelectors.selectNode(state, nodeId),
  );

  const data = node?.data as SpeechData | undefined;
  const choicesData = useMemo(() => data?.choices ?? [], [data?.choices]);

  const dialogue = useAppSelector((state: RootState) =>
    dSelectors.selectDialogue(state, activeDialogueId),
  );

  const obj = useAppSelector((state: RootState) => {
    if (!dialogue?.subjectId) return undefined;
    return mapSelectors.selectObject(state, dialogue.subjectId);
  }) as SpeakableMapObj | undefined;
  const label = data?.label ?? obj?.name ?? "Sign";

  const onLabelChange = (newLabel: string | undefined) => {
    if (!activeDialogueId) return;
    dispatch(
      actions.setNodeData({
        dialogueId: activeDialogueId,
        id: nodeId,
        data: { label: newLabel },
      }),
    );
  };

  const onLabelChangeDebounce = useDebouncedCallback(onLabelChange, 300);

  const onTextChange = useDebouncedCallback((content: string) => {
    if (!activeDialogueId) return;
    dispatch(
      actions.setNodeData({
        dialogueId: activeDialogueId,
        id: nodeId,
        data: { content },
      }),
    );
  }, 300);

  const addChoice = useCallback(() => {
    if (!activeDialogueId) return;
    const newChoice: Choice = {
      id: crypto.randomUUID(),
      text: undefined,
    };
    const choices = [...choicesData, newChoice];
    dispatch(
      actions.setNodeData({
        dialogueId: activeDialogueId,
        id: nodeId,
        data: { choices },
      }),
    );
  }, [nodeId, dispatch, choicesData, activeDialogueId]);

  const removeChoice = useCallback(
    (choiceId: string) => {
      if (!activeDialogueId) return;
      const choices = choicesData.filter((c) => c.id !== choiceId);
      dispatch(
        actions.setNodeData({
          dialogueId: activeDialogueId,
          id: nodeId,
          data: { choices },
        }),
      );
    },
    [nodeId, dispatch, choicesData, activeDialogueId],
  );

  const updateChoiceText = useDebouncedCallback(
    (choiceId: string, text: string) => {
      if (!activeDialogueId) return;
      const choices = choicesData.map((c) =>
        c.id === choiceId ? { ...c, text } : c,
      );
      dispatch(
        actions.setNodeData({
          dialogueId: activeDialogueId,
          id: nodeId,
          data: { choices },
        }),
      );
    },
    300,
  );

  const reorderChoices = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!activeDialogueId) return;
      const newChoices = [...choicesData];
      const [removed] = newChoices.splice(fromIndex, 1);
      newChoices.splice(toIndex, 0, removed);
      dispatch(
        actions.setNodeData({
          dialogueId: activeDialogueId,
          id: nodeId,
          data: { choices: newChoices },
        }),
      );
    },
    [nodeId, dispatch, choicesData, activeDialogueId],
  );

  if (!node || !data) {
    return (
      <Stack align="center" justify="center" style={{ height: "100%" }}>
        <Text size="sm" c="dimmed">
          Select a speech node to edit its properties.
        </Text>
      </Stack>
    );
  }

  const canAddChoice = choicesData.length < constants.maxDialogueChoices;

  return (
    <Stack p={0} gap="md">
      <Fieldset legend="Speech" p="xs">
        <Stack gap="sm" p={0}>
          <ResettableInput
            onReset={() => {
              onLabelChange(undefined);
              setResetKey((k) => k + 1);
            }}
          >
            <TextInput
              required
              key={`label-${nodeId}-${resetKey}`}
              label={
                <>
                  Speaker
                  <InfoTooltip>
                    By default, the speaker name is the NPC's name, but you can
                    change it per-node. For example, instead of "Guard", you
                    could set it to "Guard (angry)" to indicate a change in
                    tone.
                  </InfoTooltip>
                </>
              }
              description="The character speaking this dialogue."
              defaultValue={label}
              onChange={(event) =>
                onLabelChangeDebounce(event.currentTarget.value)
              }
            />
          </ResettableInput>

          <Textarea
            required
            key={`content-${nodeId}-${resetKey}`}
            rows={5}
            label="Content"
            description="The text that will be displayed to the player."
            placeholder="Please write NPC dialogue here..."
            defaultValue={data.content ?? ""}
            onChange={(event) => onTextChange(event.currentTarget.value)}
          />
        </Stack>
      </Fieldset>

      <Fieldset legend="Responses" p="xs">
        <Input.Description mb="xs">
          These are possible responses the player can choose from.
        </Input.Description>
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const fromIndex = choicesData.findIndex((c) => c.id === active.id);
            const toIndex = choicesData.findIndex((c) => c.id === over.id);
            if (fromIndex !== -1 && toIndex !== -1) {
              reorderChoices(fromIndex, toIndex);
            }
          }}
        >
          <Stack p={0}>
            <SortableContext
              items={choicesData.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack p={0} gap="xs">
                {choicesData.map((c) => (
                  <SortableChoice
                    key={c.id}
                    id={c.id}
                    choice={c}
                    updateChoiceText={updateChoiceText}
                    removeChoice={removeChoice}
                  />
                ))}
              </Stack>
            </SortableContext>

            {canAddChoice && (
              <Button variant="subtle" size="xs" fullWidth onClick={addChoice}>
                Add response
              </Button>
            )}
          </Stack>
        </DndContext>
      </Fieldset>
    </Stack>
  );
}

type SortableChoiceProps = {
  id: string;
  choice: Choice;
  updateChoiceText: (choiceId: string, text: string) => void;
  removeChoice: (choiceId: string) => void;
};

function SortableChoice({
  id,
  choice,
  updateChoiceText,
  removeChoice,
}: SortableChoiceProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Group gap="xs" wrap="nowrap">
        <IconGripVertical
          size={16}
          style={{ cursor: "grab" }}
          {...attributes}
          {...listeners}
        />
        <TextInput
          defaultValue={choice.text}
          style={{ flex: 1 }}
          placeholder="Type response"
          onChange={(event) => updateChoiceText(id, event.currentTarget.value)}
        />
        <CloseButton size="xs" onClick={() => removeChoice(id)} />
      </Group>
    </div>
  );
}
