import * as constants from "@/constants";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors as dSelectors } from "@/slices/dialogue";
import {
  actions as mapActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import { RootState } from "@/store/store";
import { removeLocaleEntryThunk } from "@/thunks/locale";
import { uploadSpeakerImageThunk } from "@/thunks/speakerImage";
import { Choice, DNode, SpeechData } from "@/types/dialogue";
import { SpeakableMapObj } from "@/types/map";
import { syncLocaleField } from "@/utils/locale";
import { extractVariableKeys, getDescription } from "@/utils/variableMap";
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
  Badge,
  Box,
  Button,
  CloseButton,
  Fieldset,
  Group,
  Image,
  Input,
  Stack,
  Text,
  Tooltip,
  Typography,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconGripVertical,
  IconLanguage,
  IconPhoto,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";
import InfoTooltip from "./common/InfoTooltip";
import {
  ActionButton,
  LocaleContextModal,
  LocalizedTextarea,
  LocalizedTextInput,
} from "./l10n";
import ResettableInput from "./ResettableInput";

interface SpeechEditorProps {
  node: DNode;
  currentLocale: string;
}

/**
 * Editing panel for a selected dialogue speech node.
 * Renders in the right pane of the DialogueTab.
 */
export default function SpeechEditor({
  node,
  currentLocale,
}: SpeechEditorProps) {
  const dispatch = useAppDispatch();

  const [resetKey, setResetKey] = useState(0);
  const activeDialogueId = useAppSelector(
    (state: RootState) => state.dialogue.activeDialogueId,
  )!;

  const data = node.data as SpeechData;

  const dialogue = useAppSelector((state: RootState) =>
    dSelectors.selectDialogue(state, activeDialogueId),
  );

  const obj = useAppSelector((state: RootState) => {
    if (!dialogue?.subjectId) return undefined;
    return mapSelectors.selectObject(state, dialogue.subjectId);
  }) as SpeakableMapObj | undefined;

  const speakerNameKey = data?.speakerNameKey ?? `char:${obj?.name}`;

  const addChoice = useCallback(() => {
    if (!activeDialogueId) return;
    const newChoice: Choice = {
      id: crypto.randomUUID(),
      textKey: undefined,
    };
    const choices = [...data.choices, newChoice];
    dispatch(
      actions.updateNodeData({
        dialogueId: activeDialogueId,
        id: node.id,
        data: { choices },
      }),
    );
  }, [node, dispatch, data, activeDialogueId]);

  const removeChoice = useCallback(
    (choiceId: string) => {
      if (!activeDialogueId) return;
      const choice = data.choices.find((c) => c.id === choiceId);
      if (choice?.textKey) {
        dispatch(
          removeLocaleEntryThunk({
            locale: currentLocale,
            key: choice.textKey,
          }),
        );
      }
      const choices = data.choices.filter((c) => c.id !== choiceId);
      dispatch(
        actions.updateNodeData({
          dialogueId: activeDialogueId,
          id: node.id,
          data: { choices },
        }),
      );
    },
    [node, dispatch, data, activeDialogueId, currentLocale],
  );

  const updateChoiceTextKey = useCallback(
    (choiceId: string, newKey: string) => {
      if (!activeDialogueId) return;
      const choices = data.choices.map((c) =>
        c.id === choiceId ? { ...c, textKey: newKey } : c,
      );
      dispatch(
        actions.updateNodeData({
          dialogueId: activeDialogueId,
          id: node.id,
          data: { choices },
        }),
      );
    },
    [node, dispatch, data, activeDialogueId],
  );

  const reorderChoices = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!activeDialogueId) return;
      const newChoices = [...data.choices];
      const [removed] = newChoices.splice(fromIndex, 1);
      newChoices.splice(toIndex, 0, removed);
      dispatch(
        actions.updateNodeData({
          dialogueId: activeDialogueId,
          id: node.id,
          data: { choices: newChoices },
        }),
      );
    },
    [node, dispatch, data, activeDialogueId],
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

  const remountKey = `${currentLocale}-${node.id}-${resetKey}`;
  const canAddChoice = data.choices.length < constants.maxDialogueChoices;

  return (
    <Stack p={0} gap="md">
      <Fieldset legend="Speaker" p="xs">
        <Stack gap="sm" p={0}>
          <ResettableInput
            onReset={() => {
              dispatch(
                actions.updateNodeData({
                  dialogueId: activeDialogueId,
                  id: node.id,
                  data: { speakerNameKey: undefined },
                }),
              );
              setResetKey((k) => k + 1);
            }}
          >
            <LocalizedTextInput
              key={remountKey}
              currentLocale={currentLocale}
              contentKey={speakerNameKey}
              onLocaleKeyChange={(newKey) =>
                dispatch(
                  actions.updateNodeData({
                    dialogueId: activeDialogueId,
                    id: node.id,
                    data: { speakerNameKey: newKey },
                  }),
                )
              }
              label={
                <>
                  Name
                  <InfoTooltip>
                    By default, the speaker name is the NPC's name, but you can
                    change it per-node. For example, instead of "Guard", you
                    could set it to "Guard (angry)" to indicate a change in
                    tone.
                  </InfoTooltip>
                </>
              }
              description="The character speaking this dialogue."
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
                  actions.updateNodeData({
                    dialogueId: activeDialogueId,
                    id: node.id,
                    data: { speakerImageId: imageId },
                  }),
                );
              }}
            />
          )}
        </Stack>
      </Fieldset>

      <Fieldset legend="Content" p="xs">
        <Stack gap="sm" p={0}>
          <LocalizedTextarea
            key={remountKey}
            currentLocale={currentLocale}
            contentKey={data.contentKey}
            keyPrefix={node.id}
            onLocaleKeyChange={(newKey) =>
              dispatch(
                actions.updateNodeData({
                  dialogueId: activeDialogueId,
                  id: node.id,
                  data: { contentKey: newKey },
                }),
              )
            }
            rows={5}
            label={
              <>
                Text
                <InfoTooltip>
                  <Typography>
                    <p>
                      This is the contents of the NPC's dialogue to the player.
                    </p>
                    <p>
                      You may use special variable placeholders to insert things
                      like the player's name.
                    </p>
                  </Typography>
                </InfoTooltip>
              </>
            }
            description="The text that will be displayed to the player."
            placeholder="Please write NPC dialogue here..."
          />
          <DetectedVariables localeKey={data.contentKey} />
        </Stack>
        <Input.Label mt="sm">Responses</Input.Label>
        <Input.Description mb="sm">
          These are possible responses the player can choose from.
        </Input.Description>
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const fromIndex = data.choices.findIndex((c) => c.id === active.id);
            const toIndex = data.choices.findIndex((c) => c.id === over.id);
            if (fromIndex !== -1 && toIndex !== -1) {
              reorderChoices(fromIndex, toIndex);
            }
          }}
        >
          <Stack p={0}>
            <SortableContext
              items={data.choices.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack p={0} gap="xs">
                {data.choices.map((c) => (
                  <SortableChoice
                    key={c.id}
                    id={c.id}
                    choice={c}
                    currentLocale={currentLocale}
                    updateChoiceTextKey={updateChoiceTextKey}
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
  currentLocale: string;
  updateChoiceTextKey: (choiceId: string, newKey: string) => void;
  removeChoice: (choiceId: string) => void;
};

function SortableChoice({
  id,
  choice,
  currentLocale,
  updateChoiceTextKey,
  removeChoice,
}: SortableChoiceProps) {
  const dispatch = useAppDispatch();
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const localeEntries = useAppSelector(
    (state: RootState) => state.locale.entries.entities,
  );
  const existingEntry = choice.textKey
    ? (localeEntries[choice.textKey] ?? null)
    : null;

  const [ctxOpened, { open: openCtx, close: closeCtx }] = useDisclosure(false);

  const handleCtxSave = (newCtx: string | undefined) => {
    if (!existingEntry) return;
    syncLocaleField({
      locale: currentLocale,
      existingEntry,
      newText: existingEntry.v,
      makeKey: () => existingEntry.k,
      ctx: newCtx,
      dispatch,
    });
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
        <LocalizedTextInput
          currentLocale={currentLocale}
          contentKey={choice.textKey}
          keyPrefix={id}
          onLocaleKeyChange={(newKey) => updateChoiceTextKey(id, newKey)}
          style={{ flex: 1 }}
          placeholder="Type response"
          showContextButton={false}
        />
        <ActionButton
          tooltip="Translation context"
          icon={<IconLanguage size={12} />}
          onClick={openCtx}
          disabled={!existingEntry}
        />
        <CloseButton size="xs" onClick={() => removeChoice(id)} />
      </Group>
      <LocaleContextModal
        opened={ctxOpened}
        onClose={closeCtx}
        originalText={existingEntry?.original ?? null}
        initialCtx={existingEntry?.ctx}
        onSave={handleCtxSave}
      />
    </div>
  );
}

/** Renders a row of hoverable variable badges detected in the given text. */
function DetectedVariables({ localeKey }: { localeKey: string | undefined }) {
  const localeEntries = useAppSelector(
    (state: RootState) => state.locale.entries.entities,
  );
  const text = localeKey ? (localeEntries[localeKey]?.v ?? "") : "";
  if (!text) return null;
  const keys = extractVariableKeys(text);
  if (keys.length === 0) return null;

  return (
    <Stack gap={4} p={0}>
      <Text size="xs" c="dimmed">
        Detected variables
      </Text>
      <Group gap="xs">
        {keys.map((tvar) => {
          const description = getDescription(tvar.key);

          return (
            <Tooltip
              key={tvar.key}
              label={description}
              withArrow
              multiline
              maw={220}
            >
              <Badge
                variant="light"
                color={tvar.known ? "blue" : "orange"}
                style={{
                  cursor: "pointer",
                  fontFamily: "var(--mantine-font-family-monospace, monospace)",
                }}
              >
                {tvar.key}
              </Badge>
            </Tooltip>
          );
        })}
      </Group>
    </Stack>
  );
}
