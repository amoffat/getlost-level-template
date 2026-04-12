import * as constants from "@/constants";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors as dSelectors } from "@/slices/dialogue";
import {
  actions as mapActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import type { AppDispatch } from "@/store/store";
import { RootState } from "@/store/store";
import { removeLocaleEntryThunk, syncLocaleEntryThunk } from "@/thunks/locale";
import { uploadSpeakerImageThunk } from "@/thunks/speakerImage";
import { Choice, DNode, SpeechData } from "@/types/dialogue";
import type { LocaleEntry } from "@/types/locale";
import { SpeakableMapObj } from "@/types/map";
import { makeLocaleKey } from "@/utils/locale";
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
  Textarea,
  TextInput,
  Tooltip,
  Typography,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import {
  IconGripVertical,
  IconPhoto,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";
import InfoTooltip from "./common/InfoTooltip";
import ResettableInput from "./ResettableInput";

/**
 * Syncs a locale text field to the store, handling both main and non-main
 * locales.
 *
 * - `main: true` — derives a new key via `makeKey`, removes the old entry if
 *   the key changed, syncs the new entry, and returns the new key.
 * - `main: false` — updates the translated value for the existing key,
 *   preserving `original`, `ctx`, and `lock`. Returns `undefined` (key is
 *   unchanged).
 */
function syncLocaleField({
  locale,
  existingEntry,
  newText,
  makeKey,
  ctx = null,
  dispatch,
}: {
  locale: string;
  existingEntry: LocaleEntry | null;
  newText: string | null;
  makeKey: (text: string) => string;
  ctx?: string | null;
  dispatch: AppDispatch;
}): string | undefined {
  // If we're editing an entry in a locale, but our main locale doesn't have an
  // entry, then assume this locale IS the main locale (even if its not
  // selected).
  locale = existingEntry ? locale : constants.defaultLocale;
  const main = locale === constants.defaultLocale;

  if (!newText) {
    if (existingEntry) {
      dispatch(removeLocaleEntryThunk({ locale, key: existingEntry.k }));
    }
    return;
  }

  const newKey = makeKey(newText);

  if (main) {
    if (existingEntry && existingEntry.k !== newKey) {
      dispatch(removeLocaleEntryThunk({ locale, key: existingEntry.k }));
    }
    dispatch(
      syncLocaleEntryThunk({ locale, entry: {
        k: newKey,
        v: newText,
        original: newText,
        ctx,
      }}),
    );
  } else {
    // Should never happen, since if existingEntry is not defined, we switch to
    // the main locale. We only do this for typescript linting.
    if (!existingEntry) return;

    dispatch(
      syncLocaleEntryThunk({ locale, entry: {
        k: existingEntry.k,
        v: newText,
        original: existingEntry.original,
        ctx: existingEntry.ctx,
      }}),
    );
  }

  return newKey;
}

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

  // Locale helpers — resolve a hash key to its display text
  const localeEntries = useAppSelector(
    (state: RootState) => state.locale.entries.entities,
  );

  const resolveText = useCallback(
    (key: string | undefined): string => {
      if (!key) return "";
      return localeEntries[key]?.v ?? "";
    },
    [localeEntries],
  );

  // Resolve the content entry so we can read its ctx field
  const contentEntry = data?.contentKey ? localeEntries[data.contentKey] : null;

  const speakerNameKey = data?.speakerNameKey ?? `char:${obj?.name}`;
  const resolvedSpeakerName = speakerNameKey
    ? (localeEntries[speakerNameKey]?.v ?? obj?.name ?? "Sign")
    : (obj?.name ?? "Sign");

  const onSpeakerNameChange = useCallback(
    (newText: string | undefined) => {
      if (!activeDialogueId) return;

      const newKey = syncLocaleField({
        locale: currentLocale,
        existingEntry: localeEntries[speakerNameKey],
        newText: newText ?? null,
        makeKey: (text) => makeLocaleKey({ text }),
        dispatch,
      });
      dispatch(
        actions.updateNodeData({
          dialogueId: activeDialogueId,
          id: node.id,
          data: { speakerNameKey: newKey },
        }),
      );
    },
    [activeDialogueId, speakerNameKey, dispatch, localeEntries, node.id],
  );

  const onLabelChangeDebounce = useDebouncedCallback(onSpeakerNameChange, 300);

  const onTextChange = useDebouncedCallback((newText: string) => {
    if (!activeDialogueId) return;

    const newKey = syncLocaleField({
      locale: currentLocale,
      existingEntry: contentEntry,
      newText,
      makeKey: (text) => makeLocaleKey({ text, prefix: node.id }),
      ctx: contentEntry?.ctx ?? null,
      dispatch,
    });
    dispatch(
      actions.updateNodeData({
        dialogueId: activeDialogueId,
        id: node.id,
        data: { contentKey: newKey },
      }),
    );
  }, 300);

  const onCtxChange = useDebouncedCallback((ctx: string) => {
    if (!activeDialogueId) return;
    if (!contentEntry) return;

    syncLocaleField({
      locale: currentLocale,
      existingEntry: contentEntry,
      newText: contentEntry.v,
      makeKey: () => contentEntry.k,
      ctx,
      dispatch,
    });
    dispatch(
      actions.updateNodeData({
        dialogueId: activeDialogueId,
        id: node.id,
        data: { ctx },
      }),
    );
  }, 300);

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
        dispatch(removeLocaleEntryThunk({ locale: currentLocale, key: choice.textKey }));
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

  const updateChoiceText = useDebouncedCallback(
    (choiceId: string, newText: string) => {
      if (!activeDialogueId) return;

      const existingChoice = data.choices.find((c) => c.id === choiceId);
      const existingEntry =
        (existingChoice?.textKey
          ? localeEntries[existingChoice.textKey]
          : null) ?? null;

      const newKey = syncLocaleField({
        locale: currentLocale,
        existingEntry,
        newText: newText || null,
        makeKey: (text) => makeLocaleKey({ prefix: choiceId, text }),
        dispatch,
      });
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
    300,
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

  const canAddChoice = data.choices.length < constants.maxDialogueChoices;

  return (
    <Stack p={0} gap="md">
      <Fieldset legend="Speaker" p="xs">
        <Stack gap="sm" p={0}>
          <ResettableInput
            onReset={() => {
              onSpeakerNameChange(undefined);
              setResetKey((k) => k + 1);
            }}
          >
            <TextInput
              required
              key={`label-${node.id}-${resetKey}-${currentLocale}`}
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
              defaultValue={resolvedSpeakerName}
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
          <Textarea
            required
            key={`content-${node.id}-${resetKey}-${currentLocale}`}
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
            defaultValue={resolveText(data.contentKey)}
            onChange={(event) => onTextChange(event.currentTarget.value)}
          />
          <DetectedVariables text={resolveText(data.contentKey)} />
          <Textarea
            key={`ctx-${node.id}-${resetKey}-${currentLocale}`}
            rows={5}
            label={"Translation context"}
            description="Context exclusively by the translation tool when translating to other languages."
            defaultValue={contentEntry?.ctx ?? ""}
            onChange={(event) => onCtxChange(event.currentTarget.value)}
          />
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
                    resolveText={resolveText}
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
  currentLocale: string;
  resolveText: (key: string | undefined) => string;
  updateChoiceText: (choiceId: string, text: string) => void;
  removeChoice: (choiceId: string) => void;
};

function SortableChoice({
  id,
  choice,
  currentLocale,
  resolveText,
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
          key={`choice-${id}-${currentLocale}`}
          defaultValue={resolveText(choice.textKey)}
          style={{ flex: 1 }}
          placeholder="Type response"
          onChange={(event) => updateChoiceText(id, event.currentTarget.value)}
        />
        <CloseButton size="xs" onClick={() => removeChoice(id)} />
      </Group>
    </div>
  );
}

/** Renders a row of hoverable variable badges detected in the given text. */
function DetectedVariables({ text }: { text: string | undefined }) {
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
