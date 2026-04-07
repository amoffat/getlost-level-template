import * as constants from "@/constants";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors as dSelectors } from "@/slices/dialogue";
import {
  actions as mapActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import { RootState } from "@/store/store";
import { uploadSpeakerImageThunk } from "@/thunks/speakerImage";
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
  ActionIcon,
  Box,
  Button,
  CloseButton,
  Fieldset,
  Group,
  Image,
  Input,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import {
  IconGripVertical,
  IconPhoto,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useMemo, useRef, useState } from "react";
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

          {obj && (
            <SpeakerImageSection
              objId={obj.id}
              objSpeakerImageId={obj?.speakerImageId}
              nodeSpeakerImageId={data.speakerImageId}
              onSetNodeOverride={(imageId) => {
                if (!activeDialogueId) return;
                dispatch(
                  actions.setNodeData({
                    dialogueId: activeDialogueId,
                    id: nodeId,
                    data: { speakerImageId: imageId },
                  }),
                );
              }}
            />
          )}

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
        <Input.Description mb={0}>
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

interface SpeakerImageSectionProps {
  objId: string;
  objSpeakerImageId: string | null | undefined;
  nodeSpeakerImageId: string | null | undefined;
  onSetNodeOverride: (imageId: string | null) => void;
}

/**
 * Renders the speaker portrait section inside the Speech fieldset.
 *
 * - No object image: shows an "Upload image" button → sets the object-level image.
 * - Object image, no node override: shows the object-level thumbnail + "Override" button.
 * - Node override present: shows the override thumbnail + "Remove override" button.
 */
function SpeakerImageSection({
  objId,
  objSpeakerImageId,
  nodeSpeakerImageId,
  onSetNodeOverride,
}: SpeakerImageSectionProps) {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeImageId = nodeSpeakerImageId ?? objSpeakerImageId;
  const activeImageUrl = activeImageId
    ? g.speakerImageObjectUrlCache.get(activeImageId)
    : undefined;

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!objSpeakerImageId) {
      // No object-level image yet → upload and set at the object level
      await dispatch(uploadSpeakerImageThunk({ objId, file }));
    } else {
      // Object-level image already exists → upload for per-node override only
      const resultAction = await dispatch(
        uploadSpeakerImageThunk({ objId: null, file }),
      );
      if (uploadSpeakerImageThunk.fulfilled.match(resultAction)) {
        onSetNodeOverride(resultAction.payload as string);
      }
    }
  };

  const handleRemoveOverride = () => {
    onSetNodeOverride(null);
  };

  return (
    <Stack gap={4} p={0}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <Text size="sm" fw={500}>
        Avatar
        <InfoTooltip>
          A portrait image for the speaker. You can override this on a per-node
          basis. For example, to change it to a laughing portrait when the
          player says something funny.
        </InfoTooltip>
      </Text>

      <Input.Description mb={0}>
        A visual for the character speaking.
      </Input.Description>

      {activeImageUrl ? (
        <Group gap="xs" align="flex-start">
          <Image
            src={activeImageUrl}
            w={100}
            h={100}
            fit="cover"
            style={{
              imageRendering: "pixelated",
            }}
          />
          <Stack gap={4} p={0}>
            {nodeSpeakerImageId ? (
              <Tooltip label="Remove the per-node override; the object-level image will be used">
                <ActionIcon
                  variant="default"
                  size="sm"
                  onClick={handleRemoveOverride}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Tooltip>
            ) : (
              <>
                <Tooltip label="Upload a different image for this speech node only">
                  <ActionIcon
                    variant="default"
                    size="sm"
                    onClick={handlePickFile}
                  >
                    <IconPhoto size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Remove the speaker image">
                  <ActionIcon
                    variant="default"
                    size="sm"
                    color="red"
                    onClick={() =>
                      dispatch(
                        mapActions.updateOne({
                          id: objId,
                          changes: { speakerImageId: null },
                        }),
                      )
                    }
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}
          </Stack>
        </Group>
      ) : (
        <Box>
          <Button
            variant="default"
            size="xs"
            leftSection={<IconPhoto size={14} />}
            onClick={handlePickFile}
          >
            Upload avatar
          </Button>
        </Box>
      )}
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
