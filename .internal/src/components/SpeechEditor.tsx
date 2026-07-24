import * as constants from "@/constants";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useParticipantList } from "@/hooks/useParticipant";
import { actions, selectors as dSelectors } from "@/slices/dialogue";
import { selectors as localeSelectors } from "@/slices/locale";
import {
  actions as mapActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import { selectPropertyValue } from "@/store/selectors";
import { RootState } from "@/store/store";
import { uploadSpeakerImageThunk } from "@/thunks/speakerImage";
import {
  Choice,
  DialogAvatarEmotion,
  DialogEmotion,
  DNode,
  SpeechData,
} from "@/types/dialogue";
import { SpeakableMapObj } from "@/types/map";
import { copyToClipboard } from "@/utils/copy";
import { validateSpeakerImageFile } from "@/utils/image";
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
  Input,
  Image as MantineImage,
  MultiSelect,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconCopy,
  IconGripVertical,
  IconPhoto,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { ReactNode, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import InfoTooltip from "./common/InfoTooltip";
import { ParticipantAvatar } from "./dialogue/Participant";
import { ActionButton, LocalizedTextarea } from "./l10n";
import ResettableInput from "./ResettableInput";

interface SpeechEditorProps {
  node: DNode;
  currentLocale: string;
}

// Maps each emotion to its translation key, so labels are localized.
const EMOTION_LABEL_KEYS: Record<DialogEmotion, string> = {
  nervous: "speechEditorEmotionNervous",
  embarrassed: "speechEditorEmotionEmbarrassed",
  angry: "speechEditorEmotionAngry",
  shocked: "speechEditorEmotionShocked",
  confused: "speechEditorEmotionConfused",
  idea: "speechEditorEmotionIdea",
  love: "speechEditorEmotionLove",
  sad: "speechEditorEmotionSad",
  sick: "speechEditorEmotionSick",
  sleepy: "speechEditorEmotionSleepy",
  excited: "speechEditorEmotionExcited",
  darkness: "speechEditorEmotionDarkness",
  shy: "speechEditorEmotionShy",
};

const EMOTION_VALUES = Object.keys(EMOTION_LABEL_KEYS) as DialogEmotion[];

/**
 * Editing panel for a selected dialogue speech node.
 * Renders in the right pane of the DialogueTab.
 */
export default function SpeechEditor({
  node,
  currentLocale,
}: SpeechEditorProps) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const [resetKey, setResetKey] = useState(0);
  const activeDialogueId = useAppSelector(
    (state: RootState) => state.dialogue.activeDialogueId,
  )!;

  const allMilestones = useAppSelector(dSelectors.allMilestones);

  const data = node.data as SpeechData;

  const dialogue = useAppSelector((state: RootState) =>
    dSelectors.selectDialogue(state, activeDialogueId),
  );

  // The speaker defaults to the dialogue's subject; the listener defaults to
  // the player. Only player-listener nodes may branch via choices.
  const speakerId = data.speakerId ?? dialogue?.initiatingChar ?? null;
  const listenerId = data.listenerId ?? constants.playerParticipantId;
  const isPlayerListener = listenerId === constants.playerParticipantId;
  const participantOptions = useParticipantList();

  const obj = useAppSelector((state: RootState) => {
    if (!speakerId || speakerId === constants.playerParticipantId) {
      return undefined;
    }
    return mapSelectors.selectObject(state, speakerId);
  }) as SpeakableMapObj | undefined;

  const listenerObj = useAppSelector((state: RootState) => {
    if (!listenerId || listenerId === constants.playerParticipantId) {
      return undefined;
    }
    return mapSelectors.selectObject(state, listenerId);
  }) as SpeakableMapObj | undefined;

  const speakerNameKey = useAppSelector(
    (state: RootState) =>
      data.speakerNameKey ??
      (obj
        ? (selectPropertyValue(state, obj, "nameKey") ?? undefined)
        : undefined),
  );

  const listenerNameKey = useAppSelector(
    (state: RootState) =>
      data.listenerNameKey ??
      (listenerObj
        ? (selectPropertyValue(state, listenerObj, "nameKey") ?? undefined)
        : undefined),
  );

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
      const choices = data.choices.filter((c) => c.id !== choiceId);
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

  const updateChoiceTextKey = useCallback(
    (choiceId: string, newKey: string | null) => {
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
          {t("speechEditorSelectPrompt")}
        </Text>
      </Stack>
    );
  }

  const remountKey = `${currentLocale}-${node.id}-${resetKey}`;
  const canAddChoice = data.choices.length < constants.maxDialogueChoices;

  return (
    <Stack p={0} gap="md">
      <ParticipantFieldset
        legend={t("speechEditorSpeakerLegend")}
        selectDesc={t("speechEditorSpeakerSelectDesc")}
        participantOptions={participantOptions}
        participantId={speakerId}
        onParticipantChange={(value) =>
          dispatch(
            actions.updateNodeData({
              dialogueId: activeDialogueId,
              id: node.id,
              data: { speakerId: value },
            }),
          )
        }
        nameKey={speakerNameKey}
        nameDisabled={data.speakerNameKey === undefined}
        onNameChange={(newKey) =>
          dispatch(
            actions.updateNodeData({
              dialogueId: activeDialogueId,
              id: node.id,
              data: { speakerNameKey: newKey },
            }),
          )
        }
        onNameReset={() => {
          dispatch(
            actions.updateNodeData({
              dialogueId: activeDialogueId,
              id: node.id,
              data: { speakerNameKey: undefined },
            }),
          );
          setResetKey((k) => k + 1);
        }}
        currentLocale={currentLocale}
        remountKey={remountKey}
        obj={obj}
        nodeImageId={data.speakerImageId}
        onImageOverrideChange={(imageId) => {
          if (!activeDialogueId) return;
          dispatch(
            actions.updateNodeData({
              dialogueId: activeDialogueId,
              id: node.id,
              data: { speakerImageId: imageId },
            }),
          );
        }}
        emotionFx={data.speakerEmotionFx}
        onEmotionChange={(speakerEmotionFx) => {
          if (!activeDialogueId) return;
          dispatch(
            actions.updateNodeData({
              dialogueId: activeDialogueId,
              id: node.id,
              data: { speakerEmotionFx },
            }),
          );
        }}
      />

      <ParticipantFieldset
        legend={t("speechEditorListenerLegend")}
        selectDesc={t("speechEditorListenerSelectDesc")}
        participantOptions={participantOptions}
        participantId={listenerId}
        onParticipantChange={(value) =>
          dispatch(
            actions.updateNodeData({
              dialogueId: activeDialogueId,
              id: node.id,
              data: { listenerId: value },
            }),
          )
        }
        nameKey={listenerNameKey}
        nameDisabled={data.listenerNameKey === undefined}
        onNameChange={(newKey) =>
          dispatch(
            actions.updateNodeData({
              dialogueId: activeDialogueId,
              id: node.id,
              data: { listenerNameKey: newKey },
            }),
          )
        }
        onNameReset={() => {
          dispatch(
            actions.updateNodeData({
              dialogueId: activeDialogueId,
              id: node.id,
              data: { listenerNameKey: undefined },
            }),
          );
          setResetKey((k) => k + 1);
        }}
        currentLocale={currentLocale}
        remountKey={remountKey}
        obj={listenerObj}
        nodeImageId={data.listenerImageId}
        onImageOverrideChange={(imageId) => {
          if (!activeDialogueId) return;
          dispatch(
            actions.updateNodeData({
              dialogueId: activeDialogueId,
              id: node.id,
              data: { listenerImageId: imageId },
            }),
          );
        }}
        emotionFx={data.listenerEmotionFx}
        onEmotionChange={(listenerEmotionFx) => {
          if (!activeDialogueId) return;
          dispatch(
            actions.updateNodeData({
              dialogueId: activeDialogueId,
              id: node.id,
              data: { listenerEmotionFx },
            }),
          );
        }}
      >
        {/* Only the player can be offered branching responses to choose from. */}
        {isPlayerListener && (
          <Stack gap={4} p={0}>
            <Input.Label>{t("speechEditorResponsesLabel")}</Input.Label>
            <Input.Description mb="xs">
              {t("speechEditorResponsesDesc")}
            </Input.Description>
            <DndContext
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (!over || active.id === over.id) return;
                const fromIndex = data.choices.findIndex(
                  (c) => c.id === active.id,
                );
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
                        key={`${c.id}-${remountKey}`}
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
                  <Button
                    variant="subtle"
                    size="xs"
                    fullWidth
                    onClick={addChoice}
                    leftSection={<IconPlus size={14} />}
                  >
                    {t("speechEditorAddResponse")}
                  </Button>
                )}
              </Stack>
            </DndContext>
          </Stack>
        )}
      </ParticipantFieldset>

      <Fieldset legend={t("speechEditorContentLegend")} p="xs">
        <Stack gap="sm" p={0}>
          <LocalizedTextarea
            key={remountKey}
            currentLocale={currentLocale}
            contentKey={data.contentKey}
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
                {t("speechEditorTextLabel")}
                <InfoTooltip>
                  <Text style={{ whiteSpace: "pre-line" }}>
                    {t("speechEditorTextTooltip")}
                  </Text>
                </InfoTooltip>
              </>
            }
            description={t("speechEditorContentDesc")}
            placeholder={t("speechEditorPlaceholder")}
          />
          {data.contentKey && <DetectedVariables localeKey={data.contentKey} />}
        </Stack>
      </Fieldset>

      <Fieldset legend={t("speechEditorActivationsLegend")} p="xs">
        <Stack gap="sm" p={0}>
          <MultiSelect
            label={
              <>
                {t("speechEditorActivationsLabel")}
                <InfoTooltip>
                  <Text style={{ whiteSpace: "pre-line" }}>
                    {t("speechEditorActivationsTooltip")}
                  </Text>
                </InfoTooltip>
              </>
            }
            description={t("speechEditorActivationsDesc")}
            searchable
            value={data.activationMilestones ?? []}
            onChange={(value) =>
              dispatch(
                actions.updateNodeData({
                  dialogueId: activeDialogueId,
                  id: node.id,
                  data: { activationMilestones: value },
                }),
              )
            }
            data={allMilestones}
            nothingFoundMessage={t("speechEditorActivationsNothingFound")}
          />
        </Stack>
      </Fieldset>
    </Stack>
  );
}

interface AvatarImageSectionProps {
  objId: string;
  objImageId: string | null | undefined;
  nodeImageId: string | null | undefined;
  onSetNodeOverride: (imageId: string | undefined) => void;
}

interface ParticipantFieldsetProps {
  legend: string;

  selectDesc: string;
  participantOptions: { value: string; label: string }[];
  participantId: string | null;
  onParticipantChange: (value: string | null) => void;

  nameKey: string | null | undefined;
  nameDisabled: boolean;
  onNameChange: (newKey: string | null) => void;
  onNameReset: () => void;
  currentLocale: string;
  remountKey: string;

  obj: SpeakableMapObj | undefined;
  nodeImageId: string | null | undefined;
  onImageOverrideChange: (imageId: string | undefined) => void;

  emotionFx: DialogAvatarEmotion | undefined;
  onEmotionChange: (emotionFx: DialogAvatarEmotion | undefined) => void;

  children?: ReactNode;
}

/**
 * Renders a participant's (speaker or listener) fieldset in the SpeechEditor:
 * character select, per-node name override, per-node avatar override, and
 * per-node emotion FX. Only `legend` and `selectDesc` differ meaningfully by
 * role; every other label/description is generic ("character") and shared.
 */
function ParticipantFieldset({
  legend,
  selectDesc,
  participantOptions,
  participantId,
  onParticipantChange,
  nameKey,
  nameDisabled,
  onNameChange,
  onNameReset,
  currentLocale,
  remountKey,
  obj,
  nodeImageId,
  onImageOverrideChange,
  emotionFx,
  onEmotionChange,
  children,
}: ParticipantFieldsetProps) {
  const { t } = useTranslation();

  return (
    <Fieldset legend={legend} p="xs">
      <Stack gap="sm" p={0}>
        <Select
          label={t("speechEditorParticipantSelectLabel")}
          description={selectDesc}
          placeholder={t("speechEditorParticipantSelectPlaceholder")}
          data={participantOptions}
          value={participantId}
          searchable
          renderOption={({ option }) => (
            <Group gap="xs" wrap="nowrap">
              <ParticipantAvatar
                participantId={option.value}
                scale={1.5}
                size={24}
              />
              <Text size="sm">{option.label}</Text>
            </Group>
          )}
          onChange={onParticipantChange}
        />

        <ResettableInput disabled={nameDisabled} onReset={onNameReset}>
          <LocalizedTextarea
            key={remountKey}
            currentLocale={currentLocale}
            contentKey={nameKey}
            onLocaleKeyChange={onNameChange}
            label={
              <>
                {t("speechEditorNameLabel")}
                <InfoTooltip>{t("speechEditorNameTooltip")}</InfoTooltip>
              </>
            }
            description={t("speechEditorNameDesc")}
          />
        </ResettableInput>

        {obj && (
          <AvatarImageSection
            objId={obj.id}
            objImageId={obj.speakerImageId}
            nodeImageId={nodeImageId}
            onSetNodeOverride={onImageOverrideChange}
          />
        )}

        <EmotionSection emotionFx={emotionFx} onChange={onEmotionChange} />

        {children}
      </Stack>
    </Fieldset>
  );
}

/**
 * Renders a participant portrait section (speaker or listener) inside a
 * fieldset. The object-level image lives on the map object's `speakerImageId`
 * (the character's shared portrait); the per-node override is role-specific.
 *
 * - No object image: shows an "Upload image" button → sets the object-level image.
 * - Object image, no node override: shows the object-level thumbnail + "Override" button.
 * - Node override present: shows the override thumbnail + "Remove override" button.
 */
function AvatarImageSection({
  objId,
  objImageId,
  nodeImageId,
  onSetNodeOverride,
}: AvatarImageSectionProps) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeImageId = nodeImageId ?? objImageId;
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

    const valid = await validateSpeakerImageFile(
      file,
      t("speechEditorAvatarSizeError", {
        width: constants.speakerImageSize,
        height: constants.speakerImageSize,
      }),
    );
    if (!valid) return;

    if (!objImageId) {
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
    onSetNodeOverride(undefined);
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
        {t("speechEditorAvatarLabel")}
        <InfoTooltip>{t("speechEditorAvatarTooltip")}</InfoTooltip>
      </Text>

      <Input.Description mb={0}>
        {t("speechEditorAvatarDesc")}
      </Input.Description>

      {activeImageUrl ? (
        <Group gap="xs" align="flex-start">
          <MantineImage
            src={activeImageUrl}
            w={100}
            h={100}
            fit="cover"
            style={{
              imageRendering: "pixelated",
            }}
          />
          <Stack gap={4} p={0}>
            {nodeImageId ? (
              <Tooltip label={t("speechEditorRemoveOverride")}>
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
                <Tooltip label={t("speechEditorUploadOverride")}>
                  <ActionIcon
                    variant="default"
                    size="sm"
                    onClick={handlePickFile}
                  >
                    <IconPhoto size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={t("speechEditorRemoveSpeakerImage")}>
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
            {t("speechEditorUploadAvatar")}
          </Button>
        </Box>
      )}
    </Stack>
  );
}

interface EmotionSectionProps {
  emotionFx: DialogAvatarEmotion | undefined;
  onChange: (emotionFx: DialogAvatarEmotion | undefined) => void;
}

/**
 * Lets the author pick (or clear) an optional per-node emotion FX for a
 * participant (speaker or listener). `fxOpts` is populated by a separate
 * downstream process, not authored here — this only ever writes `{ emotion }`,
 * with no `fxOpts` key.
 */
function EmotionSection({ emotionFx, onChange }: EmotionSectionProps) {
  const { t } = useTranslation();

  const emotionOptions = EMOTION_VALUES.map((value) => ({
    value,
    label: t(EMOTION_LABEL_KEYS[value]),
  }));

  return (
    <Stack gap={4} p={0}>
      <Select
        label={
          <>
            {t("speechEditorEmotionLabel")}
            <InfoTooltip>{t("speechEditorEmotionDesc")}</InfoTooltip>
          </>
        }
        description={t("speechEditorEmotionDesc")}
        placeholder={t("speechEditorEmotionPlaceholder")}
        data={emotionOptions}
        value={emotionFx?.emotion ?? null}
        clearable
        onChange={(value) =>
          onChange(value ? { emotion: value as DialogEmotion } : undefined)
        }
      />
    </Stack>
  );
}

type SortableChoiceProps = {
  id: string;
  choice: Choice;
  currentLocale: string;
  updateChoiceTextKey: (choiceId: string, newKey: string | null) => void;
  removeChoice: (choiceId: string) => void;
};

function SortableChoice({
  id,
  choice,
  currentLocale,
  updateChoiceTextKey,
  removeChoice,
}: SortableChoiceProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Group gap="xs" wrap="nowrap" align="center">
        <IconGripVertical
          size={16}
          style={{ cursor: "grab" }}
          {...attributes}
          {...listeners}
        />
        <LocalizedTextarea
          currentLocale={currentLocale}
          contentKey={choice.textKey}
          label={t("dialogueResponse")}
          onLocaleKeyChange={(newKey) => updateChoiceTextKey(id, newKey)}
          style={{ flex: 1 }}
          placeholder={t("speechEditorChoicePlaceholder")}
          contextButton
          minRows={2}
          maxRows={2}
          actionButtons={[
            <ActionButton
              key="copy"
              tooltip={t("copyIdToClipboard")}
              icon={<IconCopy size={12} />}
              onClick={() => copyToClipboard({ value: id, t })}
            />,
            <CloseButton
              key="remove"
              size="xs"
              onClick={() => removeChoice(id)}
            />,
          ]}
        />
      </Group>
    </div>
  );
}

/** Renders a row of hoverable variable badges detected in the given text. */
function DetectedVariables({ localeKey }: { localeKey: string | undefined }) {
  const { t } = useTranslation();
  const activeEntries = useAppSelector(localeSelectors.selectActiveEntries);
  const defaultLocaleEntries = useAppSelector(
    localeSelectors.selectDefaultEntries,
  );
  const text = localeKey
    ? (activeEntries[localeKey]?.v ?? defaultLocaleEntries[localeKey]?.v ?? "")
    : "";
  if (!text) return null;
  const keys = extractVariableKeys(text);
  if (keys.length === 0) return null;

  return (
    <Stack gap={4} p={0}>
      <Text size="xs" c="dimmed">
        {t("speechEditorDetectedVariables")}
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
